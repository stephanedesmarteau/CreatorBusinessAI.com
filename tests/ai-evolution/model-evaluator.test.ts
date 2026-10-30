import assert from "node:assert/strict";
import test from "node:test";

import { evaluateModel } from "../../src/lib/ai/evolution/model-evaluator";

test("un modèle découvert reçoit une évaluation préliminaire", () => {
  const model = {
    id: "modele-evaluation",
    provider: "provider-test",
    name: "Modèle à évaluer",
    tier: "balanced" as const,
    capabilities: ["text" as const],
    status: "DISCOVERED" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  const result = evaluateModel(model);

  assert.equal(result.modelId, model.id);
  assert.equal(result.compatible, true);
  assert.equal(result.capabilitiesVerified, false);
  assert.ok(result.notes.length > 0);
  assert.ok(!Number.isNaN(Date.parse(result.evaluatedAt)));
  assert.equal(model.status, "DISCOVERED");
});

test("un modèle avec un identifiant vide est refusé", () => {
  const model = {
    id: "   ",
    provider: "provider-test",
    name: "Modèle incomplet",
    tier: "balanced" as const,
    capabilities: ["text" as const],
    status: "DISCOVERED" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  const result = evaluateModel(model);

  assert.equal(result.compatible, false);
  assert.equal(result.capabilitiesVerified, false);
  assert.ok(
    result.notes.includes("Identité du modèle incomplète.")
  );
  assert.equal(model.status, "DISCOVERED");
});

test("un identifiant null est refusé sans provoquer d'exception", () => {
  const model = {
    id: null,
    provider: "provider-test",
    name: "Modèle invalide",
    tier: "balanced" as const,
    capabilities: ["text" as const],
    status: "DISCOVERED" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  const result = evaluateModel(
    model as unknown as Parameters<typeof evaluateModel>[0]
  );

  assert.equal(result.compatible, false);
  assert.equal(result.capabilitiesVerified, false);
  assert.ok(
    result.notes.includes("Identité du modèle incomplète.")
  );
});
