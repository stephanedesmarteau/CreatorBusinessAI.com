import { createOrchestratorPlan } from "./planner";
import { executeOrchestratorPlan } from "./executor";
import { synthesizeOrchestratorResult } from "./synthesizer";
import type { OrchestratorResult } from "./types";

export async function orchestrate(
  mission: string
): Promise<OrchestratorResult> {
  const plan = await createOrchestratorPlan(mission);

  const steps = await executeOrchestratorPlan(plan);

  const synthesis =
    await synthesizeOrchestratorResult(
      plan,
      steps
    );

  const traces = [
    plan.modelTrace,
    ...steps.map(
      (step) => step.modelTrace
    ),
    synthesis.modelTrace,
  ].filter(
    (
      trace
    ): trace is NonNullable<
      typeof trace
    > => Boolean(trace)
  );

  const observability = {
    totalSteps: steps.length,
    completedSteps:
      steps.filter(
        (step) =>
          step.status === "completed"
      ).length,
    failedSteps:
      steps.filter(
        (step) =>
          step.status === "failed"
      ).length,
    modelCalls: traces.length,
    fallbackCount:
      traces.filter(
        (trace) =>
          trace.fallbackUsed
      ).length,
    modelsUsed: Array.from(
      new Set(
        traces.map(
          (trace) =>
            trace.selectedModel
        )
      )
    ),
    plannerTrace:
      plan.modelTrace,
    synthesizerTrace:
      synthesis.modelTrace,
  };

  return {
    mission,
    plan,
    steps,
    result: synthesis.text,
    observability,
  };
}

export type {
  OrchestratorAgent,
  OrchestratorObservability,
  OrchestratorPlan,
  OrchestratorResult,
  OrchestratorStep,
  OrchestratorStepResult,
} from "./types";
