import test from "node:test";
import assert from "node:assert/strict";
import {
  extractUsageMetrics,
} from "../src/lib/ai/orchestrator/usage-metrics";

test("Mesure des jetons OpenAI", () => {
  const result = extractUsageMetrics({
    usage: {
      input_tokens: 1200,
      output_tokens: 800,
      total_tokens: 2000,
    },
  });

  assert.deepEqual(result, {
    inputTokens: 1200,
    outputTokens: 800,
    totalTokens: 2000,
  });
});

test("Absence de données de consommation", () => {
  assert.equal(
    extractUsageMetrics({}),
    null
  );
});

test("Calcul automatique du total", () => {
  const result = extractUsageMetrics({
    usage: {
      input_tokens: 500,
      output_tokens: 250,
    },
  });

  assert.equal(result?.totalTokens, 750);
});
