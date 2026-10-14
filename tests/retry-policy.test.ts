import test from "node:test";
import assert from "node:assert/strict";
import {
  withRetry,
  isRetryableError,
} from "../src/lib/ai/orchestrator/retry-policy";

test("Erreur 429 : reprise réussie", async () => {
  let attempts = 0;

  const result = await withRetry(async () => {
    attempts++;

    if (attempts === 1) {
      throw { status: 429 };
    }

    return "OK";
  }, { baseDelayMs: 0 });

  assert.equal(result, "OK");
  assert.equal(attempts, 2);
});

test("Erreur 503 : maximum deux tentatives", async () => {
  let attempts = 0;

  await assert.rejects(
    withRetry(async () => {
      attempts++;
      throw { status: 503 };
    }, { baseDelayMs: 0 })
  );

  assert.equal(attempts, 2);
});

test("Erreur 401 : aucune reprise", async () => {
  let attempts = 0;

  await assert.rejects(
    withRetry(async () => {
      attempts++;
      throw { status: 401 };
    }, { baseDelayMs: 0 })
  );

  assert.equal(attempts, 1);
});

test("Erreurs réseau temporaires", () => {
  assert.equal(
    isRetryableError({ code: "ETIMEDOUT" }),
    true
  );

  assert.equal(
    isRetryableError({ status: 400 }),
    false
  );
});
