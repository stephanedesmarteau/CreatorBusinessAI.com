import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateModelCost,
} from "../src/lib/ai/orchestrator/model-cost";

test("Tarif non disponible", () => {
  const result = calculateModelCost(
    "modele-test",
    {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    }
  );

  assert.equal(result.status, "unavailable");

  if (result.status === "unavailable") {
    assert.equal(result.reason, "missing_pricing");
  }
});

test("Consommation absente", () => {
  const result = calculateModelCost(
    "modele-test",
    null
  );

  assert.equal(result.status, "unavailable");

  if (result.status === "unavailable") {
    assert.equal(result.reason, "missing_usage");
  }
});

test("Identification du modèle", () => {
  const result = calculateModelCost(
    "modele-test-123",
    null
  );

  assert.equal(result.modelId, "modele-test-123");
});
