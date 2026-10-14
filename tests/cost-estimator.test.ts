import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateAICost,
} from "../src/lib/ai/orchestrator/cost-estimator";

test("Calcul des coûts IA", () => {
  const result = estimateAICost(
    {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    },
    {
      inputPerMillion: 2,
      outputPerMillion: 8,
    }
  );

  assert.equal(result.inputCostUSD, 0.002);
  assert.equal(result.outputCostUSD, 0.004);
  assert.equal(result.totalCostUSD, 0.006);
});

test("Consommation nulle", () => {
  const result = estimateAICost(
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
    {
      inputPerMillion: 2,
      outputPerMillion: 8,
    }
  );

  assert.equal(result.totalCostUSD, 0);
});

test("Fractions de centime", () => {
  const result = estimateAICost(
    {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    },
    {
      inputPerMillion: 1,
      outputPerMillion: 4,
    }
  );

  assert.ok(
    Math.abs(result.totalCostUSD - 0.0003) <
      1e-12
  );
});
