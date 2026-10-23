import assert from "node:assert/strict";
import { test } from "node:test";

type AuthorizationInput = {
  workspaceId: string;
  userId: string | null;
  ownerId: string | null;
};

function isWorkspaceOwner(
  input: AuthorizationInput
): boolean {
  return (
    input.workspaceId.trim().length > 0 &&
    input.userId !== null &&
    input.userId.length > 0 &&
    input.ownerId === input.userId
  );
}

test("Workspace vide : acces refuse", () => {
  assert.equal(
    isWorkspaceOwner({
      workspaceId: "",
      userId: "user-1",
      ownerId: "user-1",
    }),
    false
  );
});

test("Utilisateur non connecte : acces refuse", () => {
  assert.equal(
    isWorkspaceOwner({
      workspaceId: "workspace-1",
      userId: null,
      ownerId: "user-1",
    }),
    false
  );
});

test("Utilisateur non proprietaire : acces refuse", () => {
  assert.equal(
    isWorkspaceOwner({
      workspaceId: "workspace-1",
      userId: "user-2",
      ownerId: "user-1",
    }),
    false
  );
});

test("Proprietaire identifie : acces autorise", () => {
  assert.equal(
    isWorkspaceOwner({
      workspaceId: "workspace-1",
      userId: "user-1",
      ownerId: "user-1",
    }),
    true
  );
});
