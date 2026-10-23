import assert from "node:assert/strict";
import { test } from "node:test";
import { approveEvaluatedModel } from "../../src/lib/ai/evolution/model-approval-service";
import type { EvolutionModel, EvolutionEvaluation } from "../../src/lib/ai/evolution/types";

test("Autorisation refusee : approbation impossible", () => {
  const model = {
    id: "model-1",
    provider: "test-provider",
    name: "Test Model",
    tier: "balanced",
    capabilities: [],
    status: "EVALUATED",
    discoveredAt: new Date().toISOString(),
  } as EvolutionModel;
  const evaluation = {
    modelId: "model-1",
    compatible: true,
    capabilitiesVerified: true,
    evaluatedAt: new Date().toISOString(),
    notes: [],
  } as EvolutionEvaluation;
  const decision = approveEvaluatedModel(
    model, evaluation,
    { authorized: false, userId: null, reason: "Refuse" },
    true
  );
  assert.equal(decision.approved, false);
  assert.equal(decision.approvedBy, "NON_AUTORISE");
});

test("Identite absente : approbation refusee", () => {
  const model = {
    id: "model-2",
    status: "EVALUATED",
  } as EvolutionModel;
  const evaluation = {
    modelId: "model-2",
    compatible: true,
    capabilitiesVerified: true,
  } as EvolutionEvaluation;
  const decision = approveEvaluatedModel(
    model, evaluation,
    { authorized: true, userId: null, reason: "Test" },
    true
  );
  assert.equal(decision.approved, false);
  assert.equal(decision.approvedBy, "NON_AUTORISE");
});

test("Sans confirmation humaine : approbation refusee", () => {
  const model = {
    id: "model-3",
    status: "EVALUATED",
  } as EvolutionModel;
  const evaluation = {
    modelId: "model-3",
    compatible: true,
    capabilitiesVerified: true,
  } as EvolutionEvaluation;
  const decision = approveEvaluatedModel(
    model, evaluation,
    { authorized: true, userId: "owner-1", reason: "Proprietaire confirme" },
    false
  );
  assert.equal(decision.approved, false);
  assert.equal(decision.approvedBy, "owner-1");
  assert.equal(decision.reason, "Confirmation humaine explicite requise.");
});

test("Proprietaire confirme : approbation valide", () => {
  const model = {
    id: "model-4",
    status: "EVALUATED",
  } as EvolutionModel;
  const evaluation = {
    modelId: "model-4",
    compatible: true,
    capabilitiesVerified: true,
  } as EvolutionEvaluation;
  const decision = approveEvaluatedModel(
    model, evaluation,
    { authorized: true, userId: "owner-1", reason: "Proprietaire confirme" },
    true
  );
  assert.equal(decision.approved, true);
  assert.equal(decision.approvedBy, "owner-1");
  assert.equal(decision.modelId, "model-4");
});
