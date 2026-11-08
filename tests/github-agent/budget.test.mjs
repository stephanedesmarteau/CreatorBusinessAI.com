import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authorizePaidRun, billingPolicyDigest, checkPaidWindow } from '../../scripts/github-agent/budget.mjs';
import { validatePolicy, maximumCharge } from '../../scripts/github-agent/policy.mjs';

function fixture() {
  const now = new Date('2026-11-07T10:00:00Z');
  const policy = { ...JSON.parse(readFileSync(new URL('../../.github/beta-agent-policy.json', import.meta.url))),
    enabled: true, model: 'test-model-2026-11-01', inputRateMicrousdPerMillion: 1500000,
    outputRateMicrousdPerMillion: 6000000, usdToCadCeilingMicros: 1500000,
    taxAndFeesMultiplierMicros: 1200000, fixedRequestFeeMicrocad: 1000,
    monthlyFeesReserveMicrocad: 50000, settlementReserveMicrocad: 100000,
    pricingValidUntil: '2026-11-08T00:00:00Z', conversionValidUntil: '2026-11-08T00:00:00Z' };
  const ledger = { sha: 'a'.repeat(40), value: { months: {}, runs: {} } };
  const env = { GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1' };
  policy.billingApproval = { runId: '100', month: '2026-11', ledgerSha: ledger.sha,
    policyDigest: billingPolicyDigest(policy), reviewedAt: now.toISOString(), expiresAt: '2026-11-07T18:00:00Z',
    reviewedBy: 'test-reviewer', evidence: 'FAKE test evidence, no real billing approval',
    exclusiveProject: true, providerHardLimitVerified: true, cadBillingBoundVerified: true,
    settledMicrocad: 0, pendingMicrocad: 0 };
  return { policy, ledger, env, now };
}
const authorize = (f) => authorizePaidRun(f.policy, f.ledger, f.env, f.now);
test('Frais fixes par requête inclus après conversion arrondie', () => {
  const f = fixture(); assert.equal(maximumCharge(f.policy), 77600); assert.ok(authorize(f));
});
for (const field of ['fixedRequestFeeMicrocad', 'monthlyFeesReserveMicrocad', 'settlementReserveMicrocad']) {
  test(`Frais ou réserve non examinés : refus (${field})`, () => {
    const f = fixture(); f.policy[field] = null; assert.throws(() => authorize(f));
  });
}
test('Taux dérisoire et réserve de règlement absente : refus', () => {
  const f = fixture();
  assert.throws(() => validatePolicy({ ...f.policy, usdToCadCeilingMicros: 1 }, f.now), /FX_CEILING_TOO_LOW/);
  assert.throws(() => validatePolicy({ ...f.policy, settlementReserveMicrocad: 0 }, f.now), /SETTLEMENT_RESERVE_REQUIRED/);
});
for (const [name, change] of [
  ['absente', (f) => { f.policy.billingApproval = null; }],
  ['autre exécution', (f) => { f.env.GITHUB_RUN_ID = '101'; }],
  ['relance', (f) => { f.env.GITHUB_RUN_ATTEMPT = '2'; }],
  ['registre restauré', (f) => { f.ledger.sha = 'b'.repeat(40); }],
  ['autre mois', (f) => { f.policy.billingApproval.month = '2026-10'; }],
  ['tarif modifié', (f) => { f.policy.inputRateMicrousdPerMillion++; }],
  ['change modifié', (f) => { f.policy.usdToCadCeilingMicros++; }],
  ['preuve manquante', (f) => { f.policy.billingApproval.evidence = ''; }],
  ['projet partagé', (f) => { f.policy.billingApproval.exclusiveProject = false; }],
  ['plafond fournisseur non vérifié', (f) => { f.policy.billingApproval.providerHardLimitVerified = false; }],
  ['borne CAD non vérifiée', (f) => { f.policy.billingApproval.cadBillingBoundVerified = false; }],
  ['ancienne revue', (f) => { f.policy.billingApproval.reviewedAt = '2026-11-01'; }],
  ['date future', (f) => { f.policy.billingApproval.reviewedAt = '2026-11-08'; }],
  ['approbation expirée', (f) => { f.policy.billingApproval.expiresAt = f.now.toISOString(); }],
  ['dépense inconnue', (f) => { f.policy.billingApproval.pendingMicrocad = null; }],
]) {
  test(`Autorisation de facturation refusée : ${name}`, () => { const f = fixture(); change(f); assert.throws(() => authorize(f)); });
}
test('Facturation rapprochée supérieure au registre : bloque avant nouvel appel', () => {
  const f = fixture(); f.policy.billingApproval.settledMicrocad = 4800000;
  f.policy.billingApproval.pendingMicrocad = 100000;
  assert.throws(() => authorize(f), /RECONCILED_BUDGET_EXHAUSTED/);
});
test('Réservations supérieures à la facture : jamais de remboursement implicite', () => {
  const f = fixture(); f.ledger.value.months['2026-11'] = 4900000;
  assert.throws(() => authorize(f), /RECONCILED_BUDGET_EXHAUSTED/);
});
test('Borne exacte : frais mensuels et marge inclus dans 5 CAD', () => {
  const f = fixture(); f.policy.billingApproval.settledMicrocad = 4772400;
  assert.ok(authorize(f)); f.policy.billingApproval.settledMicrocad++;
  assert.throws(() => authorize(f), /RECONCILED_BUDGET_EXHAUSTED/);
});
test('Expiration entre comptage et génération : contrôle de l’heure fraîche', () => {
  const f = fixture(), auth = authorize(f);
  checkPaidWindow(f.policy, auth, f.now);
  assert.throws(() => checkPaidWindow(f.policy, auth, new Date('2026-11-07T17:59:00Z')), /PAID_WINDOW_TOO_SHORT/);
  assert.throws(() => checkPaidWindow(f.policy, auth, new Date('2026-11-08T00:00:00Z')));
});
test('Frontière mensuelle : refuse les deux dernières minutes et le mois suivant', () => {
  const f = fixture(); f.policy.pricingValidUntil = '2026-12-02'; f.policy.conversionValidUntil = '2026-12-02';
  const auth = { month: '2026-11', deadline: Date.parse('2026-12-01T01:00:00Z'), policyDigest: billingPolicyDigest(f.policy) };
  checkPaidWindow(f.policy, auth, new Date('2026-11-30T23:57:00Z'));
  assert.throws(() => checkPaidWindow(f.policy, auth, new Date('2026-11-30T23:59:00Z')), /PAID_WINDOW_TOO_SHORT/);
  assert.throws(() => checkPaidWindow(f.policy, auth, new Date('2026-12-01T00:00:00Z')), /BUDGET_MONTH_CHANGED/);
});
