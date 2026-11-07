import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeBuilderProjectCore } from "../../src/lib/builder-project-authorization-core";

test("Projet vide : acces refuse", async () => {
  let called = false;

  const result = await authorizeBuilderProjectCore(" ", {
    getWorkspace: async () => {
      called = true;
      return { id: "workspace-1" };
    },
    projectBelongsToWorkspace: async () => {
      called = true;
      return true;
    },
  });

  assert.equal(result.authorized, false);
  assert.equal(called, false);
});

test("Utilisateur non connecte : acces refuse", async () => {
  let checked = false;

  const result = await authorizeBuilderProjectCore("project-1", {
    getWorkspace: async () => null,
    projectBelongsToWorkspace: async () => {
      checked = true;
      return true;
    },
  });

  assert.equal(result.authorized, false);
  assert.equal(result.workspaceId, null);
  assert.equal(checked, false);
});

test("Projet d'un autre workspace : acces refuse", async () => {
  let checked = false;

  const result = await authorizeBuilderProjectCore("project-B", {
    getWorkspace: async () => ({ id: "workspace-A" }),
    projectBelongsToWorkspace: async (projectId, workspaceId) => {
      checked = true;
      assert.equal(projectId, "project-B");
      assert.equal(workspaceId, "workspace-A");
      return false;
    },
  });

  assert.equal(checked, true);
  assert.equal(result.authorized, false);
  assert.equal(result.workspaceId, null);
});

test("Projet du workspace : acces autorise", async () => {
  const result = await authorizeBuilderProjectCore("project-1", {
    getWorkspace: async () => ({ id: "workspace-1" }),
    projectBelongsToWorkspace: async (projectId, workspaceId) => {
      assert.equal(projectId, "project-1");
      assert.equal(workspaceId, "workspace-1");
      return true;
    },
  });

  assert.equal(result.authorized, true);
  assert.equal(result.workspaceId, "workspace-1");
});
