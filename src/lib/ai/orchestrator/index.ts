import { createOrchestratorPlan } from "./planner";
import { executeOrchestratorPlan } from "./executor";
import { synthesizeOrchestratorResult } from "./synthesizer";
import type { OrchestratorResult } from "./types";

export async function orchestrate(
  mission: string
): Promise<OrchestratorResult> {
  const plan = await createOrchestratorPlan(mission);

  const steps = await executeOrchestratorPlan(plan);

  const result =
    await synthesizeOrchestratorResult(
      plan,
      steps
    );

  return {
    mission,
    plan,
    steps,
    result,
  };
}

export type {
  OrchestratorAgent,
  OrchestratorPlan,
  OrchestratorResult,
  OrchestratorStep,
  OrchestratorStepResult,
} from "./types";
