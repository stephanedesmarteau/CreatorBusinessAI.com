
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateApprovalGate } from "../../src/lib/ai/evolution/model-approval-gate";

const authorized = {
  authorized: true,
  userId: "owner-123",
  reason: "Propriétaire confirmé."
};

test("Refuse une approbation sans confirmation humaine", () => {
  assert.throws(
    () => validateApprovalGate({
      humanConfirmed: false,
      authorization: authorized
    }),
    /Confirmation humaine explicite requise/
  );
});

test("Refuse un utilisateur non autorisé", () => {
  assert.throws(
    () => validateApprovalGate({
      humanConfirmed: true,
      authorization: {
        authorized: false,
        userId: null,
        reason: "Accès refusé."
      }
    }),
    /Autorisation du propriétaire requise/
  );
});

test("Refuse les identités automatiques", () => {
  for (const userId of ["auto", "system", " AUTO "]) {
    assert.throws(
      () => validateApprovalGate({
        humanConfirmed: true,
        authorization: { ...authorized, userId }
      }),
      /Identité humaine non valide/
    );
  }
});

test("Accepte un propriétaire autorisé avec confirmation", () => {
  assert.equal(
    validateApprovalGate({
      humanConfirmed: true,
      authorization: authorized
    }),
    "owner-123"
  );
});
