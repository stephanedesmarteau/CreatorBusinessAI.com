import { createHash } from 'node:crypto';

export const REPOSITORY = 'stephanedesmarteau/CreatorBusinessAI.com';
export const BETA = 'beta/stabilisation-securite';
export const LEDGER_BRANCH = 'automation/beta-agent-budget';
export const SOURCE_PATHS = Object.freeze([
  'src/lib/business-factory-canonical.ts',
  'src/lib/business-factory-idempotency.ts',
  'src/lib/ai/business-factory/types.ts',
]);
export const CONTEXT_TESTS = Object.freeze([
  'tests/business-factory/canonical.test.ts',
  'tests/business-factory/idempotency.test.ts',
]);
export const hash = (text) => createHash('sha256').update(text).digest('hex');
export function ensure(condition, code) {
  if (!condition) throw new Error(code);
}
const positive = (value) => Number.isSafeInteger(value) && value > 0;

export function validatePolicy(policy, now = new Date()) {
  ensure(policy?.enabled === true, 'AGENT_DISABLED');
  ensure(policy.currency === 'CAD', 'CAD_REQUIRED');
  ensure(policy.monthlyBudgetMicrocad <= 5000000, 'AUTHORIZED_MONTHLY_CAP_EXCEEDED');
  for (const field of ['monthlyBudgetMicrocad', 'perRunBudgetMicrocad', 'inputRateMicrousdPerMillion',
    'outputRateMicrousdPerMillion', 'maxInputTokens', 'maxOutputTokens', 'maxChangedFiles',
    'maxChangedLines', 'maxFileBytes', 'testWorkflowId', 'githubActionsAppId',
    'usdToCadCeilingMicros', 'taxAndFeesMultiplierMicros']) {
    ensure(positive(policy[field]), `INVALID_POLICY_${field}`);
  }
  ensure(policy.perRunBudgetMicrocad <= policy.monthlyBudgetMicrocad, 'PER_RUN_EXCEEDS_MONTH');
  ensure(typeof policy.model === 'string' && /^[a-z0-9][a-z0-9.-]+-\d{4}-\d{2}-\d{2}$/.test(policy.model), 'MODEL_SNAPSHOT_REQUIRED');
  const expiry = Date.parse(policy.pricingValidUntil);
  ensure(Number.isFinite(expiry) && expiry > now.getTime() && expiry <= now.getTime() + 31 * 86400000, 'PRICING_EXPIRED_OR_TOO_DISTANT');
  const conversionExpiry = Date.parse(policy.conversionValidUntil);
  ensure(Number.isFinite(conversionExpiry) && conversionExpiry > now.getTime() &&
    conversionExpiry <= now.getTime() + 31 * 86400000, 'CONVERSION_EXPIRED_OR_MISSING');
  ensure(policy.taxAndFeesMultiplierMicros >= 1000000, 'TAX_AND_FEES_MARGIN_REQUIRED');
  // Plancher prudent de politique, pas un cours de change supposé exact.
  ensure(policy.usdToCadCeilingMicros >= 1000000, 'FX_CEILING_TOO_LOW');
  for (const field of ['fixedRequestFeeMicrocad', 'monthlyFeesReserveMicrocad', 'settlementReserveMicrocad']) {
    ensure(Number.isSafeInteger(policy[field]) && policy[field] >= 0, 'UNREVIEWED_FIXED_FEES_OR_RESERVE');
  }
  ensure(policy.settlementReserveMicrocad >= 100000 &&
    policy.monthlyFeesReserveMicrocad + policy.settlementReserveMicrocad < policy.monthlyBudgetMicrocad, 'SETTLEMENT_RESERVE_REQUIRED');
  ensure(policy.maxInputTokens <= 16000 && policy.maxOutputTokens <= 4000 &&
    policy.maxChangedFiles <= 3 && policy.maxChangedLines <= 120 && policy.maxFileBytes <= 24000, 'POLICY_HARD_LIMIT');
  const cost = maximumCharge(policy);
  ensure(cost <= policy.perRunBudgetMicrocad, 'CALL_EXCEEDS_RUN_BUDGET');
  return cost;
}

export function maximumCharge(policy) {
  const ceil = (tokens, rate) => (BigInt(tokens) * BigInt(rate) + 999999n) / 1000000n;
  const usd = ceil(policy.maxInputTokens, policy.inputRateMicrousdPerMillion) +
    ceil(policy.maxOutputTokens, policy.outputRateMicrousdPerMillion);
  const value = (usd * BigInt(policy.usdToCadCeilingMicros) * BigInt(policy.taxAndFeesMultiplierMicros) +
    999999999999n) / 1000000000000n + 2n * BigInt(policy.fixedRequestFeeMicrocad);
  ensure(value <= BigInt(Number.MAX_SAFE_INTEGER), 'COST_OVERFLOW');
  return Number(value);
}

export function validateLedger(ledger) {
  ensure(ledger?.version === 2 && ledger.currency === 'CAD' && ledger.months && ledger.runs &&
    typeof ledger.months === 'object' && !Array.isArray(ledger.months) &&
    typeof ledger.runs === 'object' && !Array.isArray(ledger.runs), 'INVALID_LEDGER');
  for (const [month, amount] of Object.entries(ledger.months)) {
    ensure(/^\d{4}-\d{2}$/.test(month) && Number.isSafeInteger(amount) && amount >= 0, 'INVALID_LEDGER_MONTH');
  }
  const sums = {};
  for (const [id, entry] of Object.entries(ledger.runs)) {
    ensure(/^[1-9]\d*$/.test(id) && /^\d{4}-\d{2}$/.test(entry?.month) && positive(entry.cost), 'INVALID_RESERVATION');
    sums[entry.month] = (sums[entry.month] ?? 0) + entry.cost;
    ensure(Number.isSafeInteger(sums[entry.month]), 'LEDGER_OVERFLOW');
  }
  for (const [month, cost] of Object.entries(sums)) ensure(ledger.months[month] === cost, 'LEDGER_TOTAL_MISMATCH');
  for (const [month, cost] of Object.entries(ledger.months)) ensure((sums[month] ?? 0) === cost, 'LEDGER_TOTAL_MISMATCH');
  return ledger;
}

export function reserve(ledger, policy, runId, issueNumber, now = new Date()) {
  const cost = validatePolicy(policy, now);
  validateLedger(ledger);
  ensure(/^[1-9]\d*$/.test(runId) && positive(issueNumber), 'INVALID_RUN_OR_ISSUE');
  ensure(!Object.hasOwn(ledger.runs, runId), 'RUN_ALREADY_RESERVED');
  const month = now.toISOString().slice(0, 7);
  const spent = ledger.months[month] ?? 0;
  ensure(cost <= policy.monthlyBudgetMicrocad - spent - policy.monthlyFeesReserveMicrocad -
    policy.settlementReserveMicrocad, 'MONTHLY_BUDGET_EXHAUSTED');
  const next = structuredClone(ledger);
  next.months[month] = spent + cost;
  next.runs[runId] = { month, cost, issueNumber, state: 'reserved' };
  return next;
}

export function allowedPath(path, originals = {}) {
  if (typeof path !== 'string' || !/^[A-Za-z0-9/_.-]+$/.test(path) ||
    path.split('/').some((part) => !part || part === '.' || part === '..') ||
    /backup|sauvegarde|\.bak|\.env|avant-|work\.txt/i.test(path)) return false;
  return SOURCE_PATHS.includes(path) ||
    (/^tests\/agent-generated\/[a-z0-9][a-z0-9-]{0,60}\.test\.ts$/.test(path) && !Object.hasOwn(originals, path));
}

export function validateProposal(proposal, originals, policy) {
  ensure(proposal && typeof proposal === 'object' &&
    Object.keys(proposal).sort().join(',') === 'files,summary', 'INVALID_PROPOSAL');
  ensure(typeof proposal.summary === 'string' && proposal.summary.length <= 500, 'INVALID_SUMMARY');
  ensure(Array.isArray(proposal.files) && proposal.files.length > 0 && proposal.files.length <= policy.maxChangedFiles, 'FILE_LIMIT');
  const seen = new Set();
  let lines = 0;
  for (const file of proposal.files) {
    ensure(file && Object.keys(file).sort().join(',') === 'content,path' && allowedPath(file.path, originals), 'PROTECTED_PATH');
    ensure(!seen.has(file.path), 'DUPLICATE_PATH'); seen.add(file.path);
    ensure(typeof file.content === 'string' && file.content.trim() && !file.content.includes('\0') &&
      Buffer.byteLength(file.content) <= policy.maxFileBytes, 'FILE_CONTENT_LIMIT');
    ensure(!/-----BEGIN [A-Z ]*PRIVATE KEY|\bsk-[A-Za-z0-9_-]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/i.test(file.content), 'SECRET_PATTERN');
    // Défense supplémentaire pour ce périmètre de fonctions pures ; aucun outil
    // de shell ou d'accès aux fichiers n'est confié au modèle.
    ensure(!/\b(?:process|globalThis|fetch|XMLHttpRequest|WebSocket|eval|Function|require)\b|node:(?:fs|child_process|net|http|https|vm)|import\s*\(/.test(file.content), 'EFFECTFUL_CODE');
    const old = originals[file.path] ?? '';
    ensure(old !== file.content, 'NO_CHANGE');
    const a = old.split('\n'), b = file.content.split('\n');
    let start = 0, end = 0;
    while (start < a.length && start < b.length && a[start] === b[start]) start++;
    while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
    lines += a.length + b.length - 2 * (start + end);
  }
  ensure(lines <= policy.maxChangedLines, 'DIFF_LIMIT');
  return proposal.files;
}

export function assertProtection(main, beta, appId) {
  for (const rules of [main, beta]) {
    ensure(rules?.enforce_admins?.enabled && rules.allow_force_pushes?.enabled === false &&
      rules.allow_deletions?.enabled === false && rules.required_status_checks?.strict &&
      rules.required_status_checks.checks?.some((check) => check.context === 'Unit tests and TypeScript' && check.app_id === appId) &&
      rules.required_pull_request_reviews && !Object.values(rules.required_pull_request_reviews.bypass_pull_request_allowances ?? {}).some((list) => list?.length), 'BRANCH_PROTECTION_REQUIRED');
  }
  ensure(main.required_pull_request_reviews.required_approving_review_count >= 1, 'MAIN_HUMAN_REVIEW_REQUIRED');
}

export function assertMainRestriction(rulesets) {
  ensure(rulesets.some((rule) => rule.enforcement === 'active' && rule.target === 'branch' &&
    rule.conditions?.ref_name?.include?.includes('refs/heads/main') &&
    rule.conditions.ref_name.exclude?.length === 0 && rule.rules?.some((item) => item.type === 'update' && item.parameters?.update_allows_fetch_and_merge === false) &&
    rule.bypass_actors?.length === 1 && rule.bypass_actors[0].actor_type === 'RepositoryRole' &&
    rule.bypass_actors[0].actor_id === 5 && rule.bypass_actors[0].bypass_mode === 'always'), 'MAIN_ADMIN_ONLY_UPDATE_RULE_REQUIRED');
}

export function canMerge({ pr, entry, currentBase, botLogin, run, jobs, files, commit }, policy) {
  if (!pr || !entry || entry.state !== 'proposed' || pr.state !== 'open' || pr.draft || pr.merged ||
    pr.base?.ref !== BETA || pr.base.repo?.full_name !== REPOSITORY || pr.head?.repo?.full_name !== REPOSITORY ||
    pr.user?.login !== botLogin || pr.head.ref !== `ai-agent/${entry.runId}` || pr.head.sha !== entry.head ||
    entry.base !== currentBase || pr.base.sha !== currentBase || pr.mergeable !== true || pr.mergeable_state !== 'clean' ||
    commit.sha !== entry.head || commit.parents?.length !== 1 || commit.parents[0].sha !== currentBase) return false;
  if (run?.workflow_id !== policy.testWorkflowId || run.event !== 'pull_request' ||
    run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== entry.head ||
    run.repository?.full_name !== REPOSITORY || !run.pull_requests?.some((pull) => pull.number === pr.number)) return false;
  if (!Array.isArray(jobs) || !jobs.some((job) => job.name === 'Unit tests and TypeScript' && job.status === 'completed' && job.conclusion === 'success') ||
    jobs.some((job) => job.status !== 'completed' || job.conclusion !== 'success')) return false;
  if (!Array.isArray(files) || files.length !== entry.files?.length || files.length > policy.maxChangedFiles) return false;
  return files.every((file) => ['added', 'modified'].includes(file.status) && !file.previous_filename &&
    allowedPath(file.filename) && entry.files.some((expected) => expected.path === file.filename));
}
