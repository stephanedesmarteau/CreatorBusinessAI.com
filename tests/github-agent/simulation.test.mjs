import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { main } from '../../scripts/github-agent/simulate.mjs';
import { simulateAgent } from '../../scripts/github-agent/simulation.mjs';

const policyUrl = new URL('../../.github/beta-agent-policy.json', import.meta.url);
const policy = () => JSON.parse(readFileSync(policyUrl));
const digest = () => createHash('sha256').update(readFileSync(policyUrl)).digest('hex');

test('Simulation du cycle complet : aucun réseau, aucune dépense ni mutation de politique', async (t) => {
  const before = digest();
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('NETWORK_FORBIDDEN'); });
  const result = await main({ AGENT_MODE: 'simulate', BETA_AGENT_ENABLED: 'false' });
  assert.equal(result.status, 'simulation-passed');
  assert.equal(result.target, 'beta/stabilisation-securite');
  for (const key of ['aiCalls', 'networkCalls', 'remoteWrites', 'paidMicrocad', 'merges', 'deployments']) assert.equal(result[key], 0);
  assert.equal(result.mockedAiCalls, 2);
  assert.equal(result.simulatedReservationMicrocad, 77600);
  assert.ok(result.inMemoryWrites > 0);
  assert.equal(network.mock.callCount(), 0);
  assert.equal(digest(), before); assert.equal(policy().enabled, false); assert.equal(policy().billingApproval, null);
});
test('La simulation ignore même les indicateurs payants et des identifiants inutilisables', async (t) => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('NETWORK_FORBIDDEN'); });
  const result = await main({ AGENT_MODE: 'simulate', BETA_AGENT_ENABLED: 'true', BETA_AGENT_APP_ID: 'invalid',
    BETA_AGENT_APP_PRIVATE_KEY: 'invalid', BETA_AGENT_OPENAI_KEY: 'unused-test-value' });
  assert.equal(result.status, 'simulation-passed'); assert.equal(network.mock.callCount(), 0);
});
test('Exécutions répétées : scénario reproductible sans registre persistant', async () => {
  assert.deepEqual(await simulateAgent(policy()), await simulateAgent(policy()));
});
test('La simulation ne contourne pas un plafond supérieur aux 5 CAD autorisés', async () => {
  await assert.rejects(simulateAgent({ ...policy(), monthlyBudgetMicrocad: 5000001 }), /AUTHORIZED_MONTHLY_CAP_EXCEEDED/);
});
test('Le workflow automatique ne peut choisir un mode payant ni recevoir de secret', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/beta-agent.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cron: '23 \*\/6 \* \* \*'/);
  assert.match(workflow, /workflows:\s+- Beta tests/);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /pull_request:\s+branches:\s+- beta\/stabilisation-securite/);
  assert.match(workflow, /push:\s+branches:\s+- beta\/stabilisation-securite/);
  assert.match(workflow, /workflow_run\.head_branch == 'beta\/stabilisation-securite'/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /AGENT_MODE: simulate/);
  assert.match(workflow, /BETA_AGENT_ENABLED: 'false'/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.match(workflow, /github\.event\.workflow_run\.head_sha/);
  assert.doesNotMatch(workflow, /ref: main/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /secrets\.|environment:|: write|inputs\.|continue-on-error|always\(\)/);
  assert.doesNotMatch(workflow, /download-artifact|cache: npm/);
  const tests = workflow.indexOf('run: npm test');
  const types = workflow.indexOf('run: npm run typecheck');
  const simulate = workflow.indexOf('run: node scripts/github-agent/simulate.mjs');
  assert.ok(tests > 0 && types > tests && simulate > types);
});
test('Entrée dédiée : les modes réels ne peuvent pas être sélectionnés', async (t) => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('NETWORK_FORBIDDEN'); });
  for (const mode of ['merge', 'propose', 'cycle', 'initialise-budget']) {
    const result = await main({ AGENT_MODE: mode, BETA_AGENT_ENABLED: 'true' });
    assert.equal(result.status, 'simulation-passed'); assert.equal(result.remoteWrites, 0); assert.equal(result.aiCalls, 0);
  }
  assert.equal(network.mock.callCount(), 0);
});
