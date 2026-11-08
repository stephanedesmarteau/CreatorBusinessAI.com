import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BETA, REPOSITORY, SOURCE_PATHS, allowedPath, maximumCharge, reserve,
  validatePolicy, validateLedger, validateProposal, assertProtection, assertMainRestriction, canMerge } from '../../scripts/github-agent/policy.mjs';

const now = new Date('2026-11-07T00:00:00Z');
export const policy = { fixedRequestFeeMicrocad: 0, monthlyFeesReserveMicrocad: 0, settlementReserveMicrocad: 100000, enabled: true, currency: 'CAD', monthlyBudgetMicrocad: 5000000,
  usdToCadCeilingMicros: 1000000, taxAndFeesMultiplierMicros: 1000000, conversionValidUntil: '2026-11-08T00:00:00Z',
  perRunBudgetMicrocad: 50000, model: 'test-model-2026-11-01', inputRateMicrousdPerMillion: 1500000,
  outputRateMicrousdPerMillion: 6000000, pricingValidUntil: '2026-11-08T00:00:00Z',
  maxInputTokens: 12000, maxOutputTokens: 4000, maxChangedFiles: 3, maxChangedLines: 120,
  maxFileBytes: 24000, testWorkflowId: 410746902, githubActionsAppId: 15368 };
const fresh = () => ({ version: 2, currency: 'CAD', months: {}, runs: {} });

test('Budget livré : 5 CAD/mois, aucune dépense avant validation', () => {
  const delivered = JSON.parse(readFileSync(new URL('../../.github/beta-agent-policy.json', import.meta.url)));
  assert.equal(delivered.enabled, false); assert.equal(delivered.monthlyBudgetMicrocad, 5000000);
  assert.equal(delivered.currency, 'CAD'); assert.equal(delivered.perRunBudgetMicrocad, 100000);
  assert.equal(delivered.usdToCadCeilingMicros, null); assert.equal(delivered.model, null);
  assert.throws(() => validatePolicy(delivered, now), /AGENT_DISABLED/);
});
test('Coût réservé au tarif plein, raisonnement inclus dans le plafond de sortie', () => {
  assert.equal(validatePolicy(policy, now), 42000);
  assert.equal(maximumCharge({ ...policy, maxInputTokens: 1, maxOutputTokens: 1, inputRateMicrousdPerMillion: 1, outputRateMicrousdPerMillion: 1 }), 2);
});
test('Conversion CAD et frais arrondis vers le haut, sans calcul flottant', () => {
  assert.equal(maximumCharge({ ...policy, usdToCadCeilingMicros: 1500000, taxAndFeesMultiplierMicros: 1200000 }), 75600);
  assert.equal(maximumCharge({ ...policy, maxInputTokens: 1, maxOutputTokens: 1,
    inputRateMicrousdPerMillion: 1, outputRateMicrousdPerMillion: 1,
    usdToCadCeilingMicros: 1500000, taxAndFeesMultiplierMicros: 1100000 }), 4);
});
for (const change of [{ monthlyBudgetMicrocad: 5000001 }, { usdToCadCeilingMicros: null },
  { taxAndFeesMultiplierMicros: 999999 }, { conversionValidUntil: null }, { conversionValidUntil: '2020-01-01' }]) {
  test('Plafond non autorisé ou conversion non validée : refus', () => assert.throws(() => validatePolicy({ ...policy, ...change }, now)));
}
test('Plafond 5 CAD : réserve de règlement préservée, prochain appel bloqué', () => {
  const ledger = { version: 2, currency: 'CAD', months: { '2026-11': 4858000 },
    runs: { '1': { month: '2026-11', cost: 4858000 } } };
  const full = reserve(ledger, policy, '2', 7, now);
  assert.equal(full.months['2026-11'], 4900000);
  assert.throws(() => reserve(full, policy, '3', 8, now), /MONTHLY_BUDGET_EXHAUSTED/);
  assert.throws(() => validateLedger({ ...full, version: 1, currency: 'USD' }), /INVALID_LEDGER/);
});
for (const [field, value] of [['monthlyBudgetMicrocad', 0], ['perRunBudgetMicrocad', -1],
  ['inputRateMicrousdPerMillion', null], ['outputRateMicrousdPerMillion', 1.5],
  ['maxOutputTokens', 4001], ['maxChangedFiles', 4], ['maxChangedLines', 121],
  ['currency', 'EUR'], ['model', 'mutable-model'], ['pricingValidUntil', '2020-01-01']]) {
  test(`Configuration invalide refuse ${field}`, () => {
    assert.throws(() => validatePolicy({ ...policy, [field]: value }, now));
  });
}
test('Budget insuffisant : aucune réservation ni mutation', () => {
  const ledger = fresh(); const before = structuredClone(ledger);
  assert.throws(() => reserve(ledger, { ...policy, monthlyBudgetMicrocad: 40000, perRunBudgetMicrocad: 40000 }, '1', 7, now));
  assert.deepEqual(ledger, before);
});
test('Réservations cumulées : plafond mensuel et refus des reruns', () => {
  const small = { ...policy, monthlyBudgetMicrocad: 184000 };
  const first = reserve(fresh(), small, '1', 7, now);
  assert.throws(() => reserve(first, small, '1', 7, now), /RUN_ALREADY_RESERVED/);
  const second = reserve(first, small, '2', 8, now);
  assert.equal(second.months['2026-11'], 84000);
  assert.throws(() => reserve(second, small, '3', 9, now), /MONTHLY_BUDGET_EXHAUSTED/);
});
test('Registre corrompu ou dépenses effacées : refus, pas de remise à zéro', () => {
  assert.throws(() => validateLedger({ version: 2, currency: 'CAD', months: { '2026-11': 0 }, runs: { '1': { month: '2026-11', cost: 100 } } }), /LEDGER_TOTAL_MISMATCH/);
  assert.throws(() => validateLedger(null));
});
test('Nouveau mois UTC : ancien registre conservé', () => {
  const first = reserve(fresh(), policy, '1', 7, now);
  const december = { ...policy, pricingValidUntil: '2026-12-02', conversionValidUntil: '2026-12-02' };
  const next = reserve(first, december, '2', 8, new Date('2026-12-01Z'));
  assert.equal(next.months['2026-11'], 42000); assert.equal(next.months['2026-12'], 42000);
});
for (const path of ['.env', '.github/workflows/beta-tests.yml', 'scripts/github-agent/policy.mjs',
  'vercel.json', 'package.json', 'prisma/schema.prisma', 'src/proxy.ts', 'src/lib/auth/get-current-user.ts',
  'sauvegardes/a.ts', '.local-backups/a.ts', 'src/lib/a.ts.backup', '../main', '/tmp/x',
  'src\\lib\\x.ts', 'tests/business-factory/canonical.test.ts', 'tests/agent-generated/../x.test.ts']) {
  test(`Chemin protégé refusé : ${path}`, () => assert.equal(allowedPath(path), false));
}
test('Modifications bornées : helpers autorisés, tests existants immuables', () => {
  const original = { [SOURCE_PATHS[0]]: 'export const x = 1;\n' };
  assert.equal(validateProposal({ summary: 'Fix', files: [{ path: SOURCE_PATHS[0], content: 'export const x = 2;\n' }] }, original, policy).length, 1);
  assert.equal(allowedPath('tests/agent-generated/fix.test.ts'), true);
  assert.equal(allowedPath('tests/agent-generated/fix.test.ts', { 'tests/agent-generated/fix.test.ts': 'existing' }), false);
  assert.throws(() => validateProposal({ summary: 'Fix', files: [{ path: SOURCE_PATHS[0], content: original[SOURCE_PATHS[0]] }] }, original, policy), /NO_CHANGE/);
});
for (const content of ['fetch("https://example.com")', 'import fs from "node:fs"', 'process.exit(0)',
  'const x = new Function("return 1")', 'const x = import("fs")', 'x'.repeat(24001)]) {
  test('Effets de bord ou fichier trop gros refusés', () => {
    assert.throws(() => validateProposal({ summary: 'Fix', files: [{ path: SOURCE_PATHS[0], content }] }, {}, policy));
  });
}
test('Diff excessif et chemins dupliqués refusés', () => {
  const file = { path: SOURCE_PATHS[0], content: 'const a = 1;\n'.repeat(121) };
  assert.throws(() => validateProposal({ summary: 'Fix', files: [file] }, {}, policy), /DIFF_LIMIT/);
  assert.throws(() => validateProposal({ summary: 'Fix', files: [{ ...file, content: 'const a=1;' }, { ...file, content: 'const a=2;' }] }, {}, policy), /DUPLICATE_PATH/);
});

const load = (name) => JSON.parse(readFileSync(new URL(`../../.github/protections/${name}.json`, import.meta.url)));
export function protection(name) {
  return { ...load(name), enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } };
}
test('Protections serveur : revue humaine sur main et tests authentiques obligatoires', () => {
  assertProtection(protection('main'), protection('beta'), 15368);
  assertMainRestriction([load('main-ruleset')]);
  assert.throws(() => assertProtection({ ...protection('main'), enforce_admins: { enabled: false } }, protection('beta'), 15368));
  assert.throws(() => assertProtection(protection('main'), protection('beta'), 999));
  const rule = load('main-ruleset'); rule.bypass_actors.push({ actor_type: 'Integration', actor_id: 123 });
  assert.throws(() => assertMainRestriction([rule]));
});

export function mergeFixture() {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  return { pr: { number: 11, state: 'open', draft: false, merged: false, mergeable: true, mergeable_state: 'clean',
    base: { ref: BETA, sha: base, repo: { full_name: REPOSITORY } },
    head: { ref: 'ai-agent/100', sha: head, repo: { full_name: REPOSITORY } }, user: { login: 'example-agent[bot]' } },
    entry: { state: 'proposed', runId: '100', head, base, files: [{ path: SOURCE_PATHS[0], sha256: 'mock' }] },
    currentBase: base, botLogin: 'example-agent[bot]', commit: { sha: head, parents: [{ sha: base }] },
    run: { id: 1, workflow_id: policy.testWorkflowId, event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: head,
      repository: { full_name: REPOSITORY }, pull_requests: [{ number: 11 }] },
    jobs: [{ name: 'Unit tests and TypeScript', status: 'completed', conclusion: 'success' }],
    files: [{ filename: SOURCE_PATHS[0], status: 'modified' }] };
}
test('Fusion admissible : PR de l’App et tests exacts sur la bêta', () => assert.equal(canMerge(mergeFixture(), policy), true));
for (const [label, mutate] of [
  ['main', (f) => { f.pr.base.ref = 'main'; }],
  ['fork', (f) => { f.pr.head.repo.full_name = 'attacker/repo'; }],
  ['autre auteur', (f) => { f.pr.user.login = 'attacker'; }],
  ['head changé', (f) => { f.pr.head.sha = 'c'.repeat(40); }],
  ['base avancée', (f) => { f.currentBase = 'c'.repeat(40); }],
  ['workflow falsifié', (f) => { f.run.workflow_id++; }],
  ['ancien succès', (f) => { f.run.head_sha = 'c'.repeat(40); }],
  ['échec', (f) => { f.run.conclusion = 'failure'; }],
  ['test ignoré', (f) => { f.jobs[0].conclusion = 'skipped'; }],
  ['conflit', (f) => { f.pr.mergeable = false; }],
  ['statut inconnu', (f) => { f.pr.mergeable = null; }],
  ['suppression', (f) => { f.files[0].status = 'removed'; }],
  ['renommage', (f) => { f.files[0].previous_filename = 'other'; }],
  ['fichier protégé', (f) => { f.files[0].filename = 'vercel.json'; }],
  ['commit de fusion', (f) => { f.commit.parents.push({ sha: 'c'.repeat(40) }); }],
  ['brouillon', (f) => { f.pr.draft = true; }],
]) {
  test(`Fusion bloquée : ${label}`, () => { const f = mergeFixture(); mutate(f); assert.equal(canMerge(f, policy), false); });
}
