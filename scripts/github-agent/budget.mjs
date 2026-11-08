import { ensure, hash, validatePolicy } from './policy.mjs';

// L'approbation humaine, revue sur main, lie tous les tarifs et marges.
export function billingPolicyDigest(policy) {
  return hash(JSON.stringify(Object.fromEntries(Object.entries(policy)
    .filter(([key]) => key !== 'billingApproval').sort(([a], [b]) => a.localeCompare(b)))));
}

export function authorizePaidRun(policy, ledger, env, now) {
  const cost = validatePolicy(policy, now);
  const a = policy.billingApproval;
  ensure(a && a.runId === env.GITHUB_RUN_ID && env.GITHUB_RUN_ATTEMPT === '1', 'BILLING_APPROVAL_FOR_THIS_RUN_REQUIRED');
  ensure(a.month === now.toISOString().slice(0, 7) && a.ledgerSha === ledger.sha &&
    typeof a.ledgerSha === 'string' && /^[0-9a-f]{40}$/.test(a.ledgerSha), 'BILLING_CHECKPOINT_CHANGED');
  ensure(a.policyDigest === billingPolicyDigest(policy), 'BILLING_POLICY_CHANGED');
  const expiry = Date.parse(a.expiresAt), reviewed = Date.parse(a.reviewedAt);
  ensure(Number.isFinite(expiry) && Number.isFinite(reviewed) && reviewed <= now.getTime() &&
    expiry > now.getTime() && expiry - reviewed <= 86400000 && reviewed >= now.getTime() - 86400000,
  'BILLING_APPROVAL_EXPIRED');
  ensure(typeof a.reviewedBy === 'string' && a.reviewedBy.trim().length > 0 &&
    typeof a.evidence === 'string' && a.evidence.trim().length > 0 &&
    a.exclusiveProject === true && a.providerHardLimitVerified === true && a.cadBillingBoundVerified === true,
  'BILLING_EVIDENCE_REQUIRED');
  for (const amount of [a.settledMicrocad, a.pendingMicrocad]) {
    ensure(Number.isSafeInteger(amount) && amount >= 0, 'BILLING_RECONCILIATION_REQUIRED');
  }
  const reconciled = BigInt(a.settledMicrocad) + BigInt(a.pendingMicrocad);
  const reserved = BigInt(ledger.value.months[a.month] ?? 0);
  const exposure = reconciled > reserved ? reconciled : reserved;
  ensure(exposure + BigInt(cost) + BigInt(policy.monthlyFeesReserveMicrocad) +
    BigInt(policy.settlementReserveMicrocad) <= BigInt(policy.monthlyBudgetMicrocad), 'RECONCILED_BUDGET_EXHAUSTED');
  return { month: a.month, deadline: Math.min(expiry, Date.parse(policy.pricingValidUntil),
    Date.parse(policy.conversionValidUntil)), policyDigest: a.policyDigest };
}

export function checkPaidWindow(policy, authorization, now) {
  validatePolicy(policy, now);
  ensure(authorization.policyDigest === billingPolicyDigest(policy), 'BILLING_POLICY_CHANGED');
  ensure(authorization.month === now.toISOString().slice(0, 7), 'BUDGET_MONTH_CHANGED');
  const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  // Deux minutes de marge pour chaque requête (timeout transport : 60 s).
  ensure(now.getTime() + 120000 < Math.min(authorization.deadline, monthEnd), 'PAID_WINDOW_TOO_SHORT');
}
