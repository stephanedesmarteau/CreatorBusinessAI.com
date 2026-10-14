import test from "node:test";
import assert from "node:assert/strict";
import { executeOrchestratorPlan } from "../src/lib/ai/orchestrator/executor";
import type {
  OrchestratorPlan,
  OrchestratorStepResult,
} from "../src/lib/ai/orchestrator/types.ts";

function makePlan(count: number): OrchestratorPlan {
  return {
    mission: "Test du Super Engine",
    strategy: "parallel",
    steps: Array.from({ length: count }, (_, i) => ({
      id: `step-${i + 1}`,
      title: `Étape ${i + 1}`,
      agent: "general" as const,
      objective: `Objectif ${i + 1}`,
      dependsOn: [],
      status: "pending" as const,
    })),
  };
}

test("Mission réussie", async () => {
  const results = await executeOrchestratorPlan(
    makePlan(3),
    async (_mission, step): Promise<OrchestratorStepResult> => ({
      id: step.id,
      title: step.title,
      agent: step.agent,
      objective: step.objective,
      status: "completed",
      output: "OK",
    })
  );

  assert.equal(results.length, 3);
  assert.ok(results.every((r) => r.status === "completed"));
});

test("Échec et blocage des dépendances", async () => {
  const plan = makePlan(3);

  plan.steps[1].dependsOn = ["step-1"];
  plan.steps[2].dependsOn = ["step-2"];

  const called: string[] = [];

  const results = await executeOrchestratorPlan(
    plan,
    async (_mission, step) => {
      called.push(step.id);

      return {
        id: step.id,
        title: step.title,
        agent: step.agent,
        objective: step.objective,
        status: step.id === "step-1" ? "failed" : "completed",
        output: "Test",
      };
    }
  );

  assert.deepEqual(called, ["step-1"]);
  assert.equal(results.length, 3);
  assert.ok(results.every((r) => r.status === "failed"));
});

test("Maximum trois agents simultanés", async () => {
  let active = 0;
  let maximum = 0;

  const results = await executeOrchestratorPlan(
    makePlan(8),
    async (_mission, step) => {
      active++;
      maximum = Math.max(maximum, active);

      await new Promise((resolve) => setTimeout(resolve, 15));

      active--;

      return {
        id: step.id,
        title: step.title,
        agent: step.agent,
        objective: step.objective,
        status: "completed",
        output: "OK",
      };
    }
  );

  assert.equal(results.length, 8);
  assert.equal(maximum, 3);
});

test("Échec propagé sur cinq étapes", async () => {
  const plan = makePlan(5);

  for (let i = 1; i < plan.steps.length; i++) {
    plan.steps[i].dependsOn = [
      plan.steps[i - 1].id,
    ];
  }

  const called: string[] = [];

  const results = await executeOrchestratorPlan(
    plan,
    async (_mission, step) => {
      called.push(step.id);

      return {
        id: step.id,
        title: step.title,
        agent: step.agent,
        objective: step.objective,
        status: "failed",
        output: "Erreur simulée",
      };
    }
  );

  assert.deepEqual(called, ["step-1"]);
  assert.equal(results.length, 5);
  assert.ok(
    results.every((r) => r.status === "failed")
  );
});
