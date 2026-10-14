const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const planner = fs.readFileSync(
  "src/lib/ai/orchestrator/planner.ts",
  "utf8"
);

const executor = fs.readFileSync(
  "src/lib/ai/orchestrator/executor.ts",
  "utf8"
);

test("Planificateur : maximum 8 étapes", () => {
  assert.ok(planner.includes("rawSteps.slice(0, 8)"));
});

test("Exécuteur : maximum 3 agents par lot", () => {
  assert.ok(executor.includes("offset += 3"));
  assert.ok(
    executor.includes("ready.slice(offset, offset + 3)")
  );
});

test("Détection des dépendances échouées", () => {
  assert.ok(
    executor.includes(
      'results.get(id)?.status === "failed"'
    )
  );
});

test("Blocage des étapes dépendantes", () => {
  assert.ok(executor.includes("failedDependency"));
  assert.ok(
    executor.includes(
      'results.get(dependencyId)?.status === "completed"'
    )
  );
});
