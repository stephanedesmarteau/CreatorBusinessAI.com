import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { billingPolicyDigest } from '../../scripts/github-agent/budget.mjs';
import { runAgent } from '../../scripts/github-agent/controller.mjs';
import { openaiClient, RemoteError } from '../../scripts/github-agent/clients.mjs';
import { BETA, LEDGER_BRANCH, REPOSITORY, SOURCE_PATHS } from '../../scripts/github-agent/policy.mjs';

const now = new Date('2026-11-07T00:00:00Z');
const load = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url)));
const policy = { ...load('.github/beta-agent-policy.json'), enabled: true, fixedRequestFeeMicrocad: 0, monthlyFeesReserveMicrocad: 0, settlementReserveMicrocad: 100000, monthlyBudgetMicrocad: 5000000,
  usdToCadCeilingMicros: 1000000, taxAndFeesMultiplierMicros: 1000000, conversionValidUntil: '2026-11-08T00:00:00Z',
  perRunBudgetMicrocad: 50000, model: 'test-model-2026-11-01', inputRateMicrousdPerMillion: 1500000,
  outputRateMicrousdPerMillion: 6000000, pricingValidUntil: '2026-11-08T00:00:00Z' };
function fixture(options = {}) {
  const events = [], base = 'a'.repeat(40), head = 'b'.repeat(40);
  let clockNow = now;
  let ledger = { version: 2, currency: 'CAD', months: {}, runs: {} }, baseReads = 0;
  if (options.exhausted) ledger = { version: 2, currency: 'CAD', months: { '2026-11': 5000000 },
    runs: { '99': { month: '2026-11', cost: 5000000, issueNumber: 8, state: 'reserved' } } };
  const file = (text) => ({ type: 'file', encoding: 'base64', size: Buffer.byteLength(text), content: Buffer.from(text).toString('base64'), sha: 'd'.repeat(40) });
  const gh = async (method, url, data) => {
    events.push({ method, url, data });
    if (url.endsWith(`/git/ref/heads/${BETA}`)) {
      baseReads++; return { object: { sha: options.baseMoved && baseReads > 1 ? 'c'.repeat(40) : base } };
    }
    if (url.endsWith('/protection')) {
      const rules = load(`.github/protections/${url.includes('/main/') ? 'main' : 'beta'}.json`);
      return { ...rules, enforce_admins: { enabled: !options.unprotected }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } };
    }
    if (url.includes('/rulesets?')) return [{ id: 1 }];
    if (url.endsWith('/rulesets/1')) return load('.github/protections/main-ruleset.json');
    if (url.includes('/hooks?')) return [];
    if (url.endsWith('/pages')) throw new RemoteError(404);
    if (url.includes('/contents/vercel.json?')) return file(JSON.stringify({ git: { deploymentEnabled: false } }));
    if (url.includes('/contents/ledger.json?')) {
      if (options.missingLedger) throw new RemoteError(404);
      return file(JSON.stringify(ledger));
    }
    if (url.endsWith('/contents/ledger.json') && method === 'PUT') {
      assert.equal(data.branch, LEDGER_BRANCH); assert.equal(data.sha, 'd'.repeat(40));
      if (options.casConflict) throw new RemoteError(409);
      ledger = JSON.parse(Buffer.from(data.content, 'base64').toString());
      if (options.expireAfterSave) clockNow = new Date('2026-11-08T00:00:00Z');
      return { content: { sha: 'd'.repeat(40) } };
    }
    if (url.includes('/pulls?')) return [];
    if (url.endsWith('/issues/7')) return { number: 7, state: 'open', title: 'Fix helper', body: 'Untrusted text', labels: [{ name: 'beta-agent' }], author_association: options.outsider ? 'NONE' : 'OWNER' };
    if (url.includes('/contents/')) return file('export const example = 1;\n');
    if (url.endsWith(`/git/commits/${base}`)) return { tree: { sha: 'tree-parent' } };
    if (url.endsWith('/git/trees')) return { sha: 'tree-child' };
    if (url.endsWith('/git/commits')) return { sha: head };
    if (url.endsWith('/git/refs')) { assert.equal(data.ref, 'refs/heads/ai-agent/100'); return {}; }
    if (url.endsWith('/pulls') && method === 'POST') { assert.equal(data.base, BETA); return { number: 11 }; }
    throw new Error(`Unexpected mock endpoint ${method} ${url}`);
  };
  const ai = {
    count: async () => { events.push({ method: 'AI_COUNT' });
      if (options.expireAfterCount) clockNow = new Date('2026-11-08T00:00:00Z');
      return { input_tokens: options.tooManyTokens ? 12001 : 100 }; },
    create: async (body) => {
      events.push({ method: 'AI_CREATE' });
      assert.equal(body.max_output_tokens, 4000); assert.equal(body.store, false);
      assert.deepEqual(body.tools, []); assert.equal(body.service_tier, 'default');
      if (options.aiFailure) throw new RemoteError(503);
      return { status: 'completed', model: policy.model, usage: { input_tokens: 100, output_tokens: 30 },
        output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ summary: 'Fix', files: [{ path: SOURCE_PATHS[0], content: 'export const example = 2;\n' }] }) }] }] };
    },
  };
  const approved = { ...policy, billingApproval: { runId: '100', month: '2026-11', ledgerSha: 'd'.repeat(40),
    policyDigest: billingPolicyDigest(policy), reviewedAt: now.toISOString(), expiresAt: '2026-11-08T00:00:00Z',
    reviewedBy: 'test-reviewer', evidence: 'simulated billing evidence; no real account', exclusiveProject: true,
    providerHardLimitVerified: true, cadBillingBoundVerified: true, settledMicrocad: 0, pendingMicrocad: 0 } };
  return { args: { policy: approved, env: { BETA_AGENT_ENABLED: 'true', GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main',
    GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1', AGENT_MODE: 'propose', AGENT_ISSUE_NUMBER: '7', GITHUB_EVENT_NAME: 'workflow_dispatch' },
    gh, ai, botLogin: 'example-agent[bot]', clock: () => clockNow }, events, ledger: () => ledger };
}

test('Agent désactivé : aucun accès distant, aucune dépense', async () => {
  const f = fixture(); f.args.policy = { ...policy, enabled: false };
  assert.deepEqual(await runAgent(f.args), { status: 'disabled', aiCalls: 0 }); assert.equal(f.events.length, 0);
});
test('Contrôleur hors main et budget nul : refus avant accès réseau', async () => {
  for (const change of [(a) => { a.env.GITHUB_REF = `refs/heads/${BETA}`; }, (a) => { a.policy = { ...policy, monthlyBudgetMicrocad: 0 }; }]) {
    const f = fixture(); change(f.args); await assert.rejects(runAgent(f.args)); assert.equal(f.events.length, 0);
  }
});
for (const option of ['unprotected', 'missingLedger', 'casConflict', 'outsider', 'exhausted']) {
  test(`${option} : aucun appel IA ni publication`, async () => {
    const f = fixture({ [option]: true }); await assert.rejects(runAgent(f.args));
    assert.equal(f.events.some((event) => event.method.startsWith('AI_')), false);
    assert.equal(f.events.some((event) => event.method === 'POST'), false);
  });
}
test('Réservation durable avant comptage et génération, puis PR bêta sans fusion', async () => {
  const f = fixture(); assert.deepEqual(await runAgent(f.args), { status: 'proposed', pull: 11, aiCalls: 1 });
  const reservation = f.events.findIndex((e) => e.method === 'PUT');
  assert.ok(reservation < f.events.findIndex((e) => e.method === 'AI_COUNT'));
  assert.ok(reservation < f.events.findIndex((e) => e.method === 'AI_CREATE'));
  assert.equal(f.ledger().months['2026-11'], 42000); assert.equal(f.ledger().runs['100'].state, 'proposed');
  assert.equal(f.events.some((e) => e.url?.endsWith('/merge')), false);
  assert.equal(f.events.some((e) => e.url?.includes('/deployments')), false);
});
for (const option of ['tooManyTokens', 'aiFailure', 'baseMoved']) {
  test(`${option} : réservation conservée, aucune branche ni PR créée`, async () => {
    const f = fixture({ [option]: true }); await assert.rejects(runAgent(f.args));
    assert.equal(f.ledger().months['2026-11'], 42000);
    assert.equal(f.events.some((e) => e.method === 'POST'), false);
    assert.ok(f.events.filter((e) => e.method === 'AI_CREATE').length <= 1);
  });
}
test('Mode fusion ne lance aucun appel IA et ne propose aucun code', async () => {
  const f = fixture(); f.args.env.AGENT_MODE = 'merge';
  assert.equal((await runAgent(f.args)).status, 'nothing-to-merge');
  assert.equal(f.events.some((e) => e.method.startsWith('AI_') || e.method === 'POST' || e.method === 'PUT'), false);
});
for (const option of ['expireAfterSave', 'expireAfterCount']) {
  test(`Horloge fraîche ${option} : bloque l’appel suivant, réservation conservée`, async () => {
    const f = fixture({ [option]: true }); await assert.rejects(runAgent(f.args));
    assert.equal(f.events.some((e) => e.method === 'AI_CREATE'), false);
    assert.equal(f.events.filter((e) => e.method === 'AI_COUNT').length, option === 'expireAfterCount' ? 1 : 0);
    assert.equal(f.ledger().months['2026-11'], 42000);
  });
}
test('Absence de validation de facturation : aucun appel IA', async () => {
  const f = fixture(); f.args.policy.billingApproval = null;
  await assert.rejects(runAgent(f.args), /BILLING_APPROVAL_FOR_THIS_RUN_REQUIRED/);
  assert.equal(f.events.some((e) => e.method.startsWith('AI_') || e.method === 'PUT' || e.method === 'POST'), false);
});
test('Client OpenAI : erreurs sans corps sensible, sans retry, redirections interdites', async () => {
  let calls = 0;
  const client = openaiClient('fake-test-key', async (url, init) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(init.redirect, 'error');
    return new Response('sensitive response', { status: 429 });
  });
  await assert.rejects(client.create({}), (error) => error.message === 'REMOTE_HTTP_429'); assert.equal(calls, 1);
});
