export type AgentRunStep = {
  agent?: string;
  objective?: string;
  title?: string;
  status?: string;
  output?: string;
  durationMs?: number;
  modelTrace?: {
    selectedModel?: string;
    usage?: unknown;
    cost?: unknown;
    fallbackUsed?: boolean;
    attempts?: unknown[];
  };
};

export function prepareAgentRun(
  step: AgentRunStep,
  projectId: string | null
) {
  return {
    projectId,
    agent: step.agent || "unknown",
    objective: step.objective || "",
    status:
      step.status === "failed"
        ? "FAILED"
        : "COMPLETED",
    durationMs:
      typeof step.durationMs === "number" &&
      Number.isFinite(step.durationMs) &&
      step.durationMs >= 0
        ? Math.round(step.durationMs)
        : null,
    input: {
      title: step.title || "",
    },
    model:
      step.modelTrace?.selectedModel || null,
    output: {
      text: step.output || "",
      modelTrace: step.modelTrace
        ? {
            selectedModel:
              step.modelTrace.selectedModel,
            usage:
              step.modelTrace.usage ?? null,
            cost:
              step.modelTrace.cost ?? null,
            fallbackUsed:
              step.modelTrace.fallbackUsed,
            attempts:
              step.modelTrace.attempts ?? [],
          }
        : null,
    },
  };
}

export async function persistAgentRuns(
  steps: AgentRunStep[],
  projectId: string | null,
  send: typeof fetch = fetch
) {
  const results = await Promise.allSettled(
    steps.map(async (step) => {
      const response = await send("/api/agent-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          prepareAgentRun(step, projectId)
        ),
      });

      if (!response.ok) {
        throw new Error(
          `AgentRun HTTP ${response.status}`
        );
      }
    })
  );

  const successes = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  return {
    total: results.length,
    successes,
    failures: results.length - successes,
    results,
  };
}
