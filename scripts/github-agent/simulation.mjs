import { readFile } from 'node:fs/promises';
import { runAgent } from './controller.mjs';
import { billingPolicyDigest } from './budget.mjs';
import { BETA, LEDGER_BRANCH, REPOSITORY, SOURCE_PATHS, ensure } from './policy.mjs';
import { RemoteError } from './clients.mjs';

// Scénario fictif : aucun client HTTP, aucun secret, aucune écriture sur disque.
// Les mutations du contrôleur sont confinées à cette mémoire locale.
export async function simulateAgent(deliveredPolicy) {
  const now = new Date('2026-11-07T12:00:00Z');
  const base = 'a'.repeat(40), head = 'b'.repeat(40), contentSha = 'd'.repeat(40);
  const root = `/repos/${REPOSITORY}`;
  const load = async (name) => JSON.parse(await readFile(new URL(`../../.github/protections/${name}.json`, import.meta.url), 'utf8'));
  const rules = { main: await load('main'), beta: await load('beta'), mainRule: await load('main-ruleset') };
  const policy = { ...deliveredPolicy, enabled: true, model: 'simulation-model-2026-11-01',
    inputRateMicrousdPerMillion: 1500000, outputRateMicrousdPerMillion: 6000000,
    usdToCadCeilingMicros: 1500000, taxAndFeesMultiplierMicros: 1200000,
    fixedRequestFeeMicrocad: 1000, monthlyFeesReserveMicrocad: 50000, settlementReserveMicrocad: 100000,
    pricingValidUntil: '2026-11-08T00:00:00Z', conversionValidUntil: '2026-11-08T00:00:00Z' };
  policy.billingApproval = { runId: '100', month: '2026-11', ledgerSha: contentSha,
    policyDigest: billingPolicyDigest(policy), reviewedAt: now.toISOString(), expiresAt: '2026-11-08T00:00:00Z',
    reviewedBy: 'simulation-only', evidence: 'FICTITIOUS: not a real billing approval',
    exclusiveProject: true, providerHardLimitVerified: true, cadBillingBoundVerified: true,
    settledMicrocad: 0, pendingMicrocad: 0 };
  let ledger = { version: 2, currency: 'CAD', months: {}, runs: {} }, writes = 0, mockCalls = 0;
  const file = (text) => ({ type: 'file', encoding: 'base64', size: Buffer.byteLength(text),
    content: Buffer.from(text).toString('base64'), sha: contentSha });
  const gh = async (method, url, data) => {
    ensure(url.startsWith(root + '/'), 'SIMULATION_ENDPOINT_DENIED');
    if (method === 'GET') {
      if (url === `${root}/git/ref/heads/${BETA}`) return { object: { sha: base } };
      if (url.endsWith('/protection')) {
        const value = url.includes('/branches/main/') ? rules.main : rules.beta;
        return { ...value, enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } };
      }
      if (url.includes('/rulesets?')) return [{ id: 1 }];
      if (url.endsWith('/rulesets/1')) return rules.mainRule;
      if (url.includes('/hooks?') || url.includes('/pulls?')) return [];
      if (url.endsWith('/pages')) throw new RemoteError(404);
      if (url.includes('/contents/vercel.json?')) return file(JSON.stringify({ git: { deploymentEnabled: false } }));
      if (url.includes('/contents/ledger.json?')) return file(JSON.stringify(ledger));
      if (url.includes('/contents/')) return file('export const simulationValue = 1;\n');
      if (url.includes('/issues?')) return [{ number: 7, author_association: 'OWNER' }];
      if (url.endsWith('/issues/7')) return { number: 7, state: 'open', title: 'Synthetic simulation',
        body: 'No real issue is read or changed.', labels: [{ name: 'beta-agent' }], author_association: 'OWNER' };
      if (url === `${root}/git/commits/${base}`) return { tree: { sha: 'synthetic-tree' } };
    }
    if (method === 'PUT' && url === `${root}/contents/ledger.json`) {
      ensure(data.branch === LEDGER_BRANCH && data.sha === contentSha, 'SIMULATION_LEDGER_DENIED');
      ledger = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')); writes++;
      return { content: { sha: contentSha } };
    }
    if (method === 'POST' && url === `${root}/git/trees`) { writes++; return { sha: 'synthetic-tree' }; }
    if (method === 'POST' && url === `${root}/git/commits`) { writes++; return { sha: head }; }
    if (method === 'POST' && url === `${root}/git/refs`) {
      ensure(data.ref === 'refs/heads/ai-agent/100', 'SIMULATION_BRANCH_DENIED'); writes++; return {};
    }
    if (method === 'POST' && url === `${root}/pulls`) {
      ensure(data.base === BETA, 'SIMULATION_TARGET_DENIED'); writes++; return { number: 11 };
    }
    // Aucun fallback réseau, même si le contrôleur demande une nouvelle opération.
    throw new Error('SIMULATION_OPERATION_DENIED');
  };
  const ai = {
    count: async () => { mockCalls++; return { input_tokens: 100 }; },
    create: async () => {
      mockCalls++;
      return { status: 'completed', model: policy.model, usage: { input_tokens: 100, output_tokens: 30 },
        output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ summary: 'Synthetic simulation',
          files: [{ path: SOURCE_PATHS[0], content: 'export const simulationValue = 2;\n' }] }) }] }] };
    },
  };
  const result = await runAgent({ policy, gh, ai, botLogin: 'simulation-agent[bot]', clock: () => now,
    env: { BETA_AGENT_ENABLED: 'true', GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main',
      GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1', GITHUB_EVENT_NAME: 'schedule', AGENT_MODE: 'cycle' } });
  ensure(result.status === 'proposed' && ledger.runs['100'].state === 'proposed', 'SIMULATION_FAILED');
  return { status: 'simulation-passed', scenario: 'synthetic-cycle', simulatedDecision: 'propose-beta',
    target: BETA, aiCalls: 0, networkCalls: 0, remoteWrites: 0, paidMicrocad: 0,
    merges: 0, deployments: 0, mockedAiCalls: mockCalls, inMemoryWrites: writes,
    simulatedReservationMicrocad: ledger.months['2026-11'], configuredMonthlyCapMicrocad: deliveredPolicy.monthlyBudgetMicrocad };
}
