import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeModelApprovalCore } from "../../src/lib/ai/evolution/model-authorization-core";

test("Workspace vide : acces refuse", async () => {
  let called = false;
  const result = await authorizeModelApprovalCore("", {
    getUser: async () => { called = true; return { id: "user-1" }; },
    isWorkspaceOwner: async () => { called = true; return true; },
  });
  assert.equal(result.authorized, false);
  assert.equal(called, false);
});

test("Utilisateur non connecte : acces refuse", async () => {
  let ownershipChecked = false;
  const result = await authorizeModelApprovalCore("workspace-1", {
    getUser: async () => null,
    isWorkspaceOwner: async () => {
      ownershipChecked = true;
      return true;
    },
  });
  assert.equal(result.authorized, false);
  assert.equal(result.userId, null);
  assert.equal(ownershipChecked, false);
});

test("Utilisateur non proprietaire : acces refuse", async () => {
  let ownershipChecked = false;
  const result = await authorizeModelApprovalCore("workspace-1", {
    getUser: async () => ({ id: "user-2" }),
    isWorkspaceOwner: async (workspaceId, userId) => {
      ownershipChecked = true;
      assert.equal(workspaceId, "workspace-1");
      assert.equal(userId, "user-2");
      return false;
    },
  });
  assert.equal(ownershipChecked, true);
  assert.equal(result.authorized, false);
  assert.equal(result.userId, null);
});

test("Proprietaire authentifie : autorisation accordee", async () => {
  const result = await authorizeModelApprovalCore("workspace-1", {
    getUser: async () => ({ id: "owner-1" }),
    isWorkspaceOwner: async (workspaceId, userId) => {
      assert.equal(workspaceId, "workspace-1");
      assert.equal(userId, "owner-1");
      return true;
    },
  });
  assert.equal(result.authorized, true);
  assert.equal(result.userId, "owner-1");
});

test("Identifiant utilisateur vide : acces refuse sans verification du proprietaire", async () => {
  let ownershipChecked = false;

  const result = await authorizeModelApprovalCore("workspace-1", {
    getUser: async () => ({ id: "   " }),
    isWorkspaceOwner: async () => {
      ownershipChecked = true;
      return true;
    },
  });

  assert.equal(result.authorized, false);
  assert.equal(result.userId, null);
  assert.equal(ownershipChecked, false);
  assert.equal(result.reason, "Authentification requise.");
});
