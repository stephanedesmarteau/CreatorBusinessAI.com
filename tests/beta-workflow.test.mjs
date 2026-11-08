import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/beta-tests.yml', import.meta.url), 'utf8');

test('Tests bêta : seuls les pushes et PR vers la bêta déclenchent le workflow', () => {
  for (const trigger of ['push', 'pull_request']) {
    const block = workflow.match(new RegExp(`\\n  ${trigger}:\\n([\\s\\S]*?)(?=\\n  \\S|\\npermissions:)`))?.[1];
    assert.ok(block);
    const branches = [...block.matchAll(/^\s+- (.+)$/gm)].map((match) => match[1]);
    assert.deepEqual(branches, ['beta/stabilisation-securite']);
  }
  assert.doesNotMatch(workflow, /schedule:|workflow_dispatch:|pull_request_target:|workflow_run:/);
});
test('Tests bêta : jeton en lecture seule, aucun secret ni déploiement', () => {
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /secrets\.|environment:|: write|id-token:|pages:|deployments:/);
  assert.doesNotMatch(workflow, /run:.*(?:gh pr merge|gh workflow run|vercel|deploy)/);
  for (const action of [...workflow.matchAll(/uses: (.+)/g)]) assert.match(action[1], /@[a-f0-9]{40}(?:\s|$)/);
});
test('Tests bêta : toute erreur bloque la simulation, aucun mode payant', () => {
  const unit = workflow.indexOf('run: npm test');
  const types = workflow.indexOf('run: npm run typecheck');
  const simulation = workflow.indexOf('run: node scripts/github-agent/simulate.mjs');
  assert.ok(unit > 0 && types > unit && simulation > types);
  assert.doesNotMatch(workflow, /continue-on-error|always\(\)|\|\| true|github-agent\/run\.mjs/);
  assert.match(workflow, /BETA_AGENT_ENABLED: 'false'/);
  assert.match(workflow, /AGENT_MODE: simulate/);
});
test('Tests bêta : installation verrouillée et limitation des exécutions obsolètes', () => {
  assert.match(workflow, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.doesNotMatch(workflow, /run:.*(?:npm run build|next build|prisma migrate|prisma db)/);
});
