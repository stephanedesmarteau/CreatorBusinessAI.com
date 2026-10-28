import assert from "node:assert/strict";
import test from "node:test";

import { persistDiscoveredModel } from "../../../src/lib/ai/evolution/model-discovery-persistence-service";

const candidate = {
  id: "model-test",
  provider: "provider-test",
  name: "Modèle de test",
  tier: "balanced" as const,
  capabilities: ["text" as const],
  source: "catalogue-test",
};

test("le propriétaire peut enregistrer un modèle découvert", async () => {
  let writes = 0;

  const result = await persistDiscoveredModel(
    "workspace-1",
    candidate,
    {
      getUser: async () => ({ id: "user-1" }),
      isWorkspaceOwner: async () => true,
      createIfAbsent: async (record) => {
        writes++;
        assert.equal(record.status, "DISCOVERED");
        assert.equal(record.workspaceId, "workspace-1");
        return { id: "record-1", created: true };
      },
    }
  );

  assert.equal(result.created, true);
  assert.equal(writes, 1);
});

test("un utilisateur non authentifié ne peut pas enregistrer", async () => {
  let writes = 0;

  await assert.rejects(
    persistDiscoveredModel("workspace-1", candidate, {
      getUser: async () => null,
      isWorkspaceOwner: async () => false,
      createIfAbsent: async () => {
        writes++;
        return { id: "record-1", created: true };
      },
    }),
    /Authentification requise/
  );

  assert.equal(writes, 0);
});

test("un non-propriétaire ne peut pas enregistrer", async () => {
  let writes = 0;

  await assert.rejects(
    persistDiscoveredModel("workspace-1", candidate, {
      getUser: async () => ({ id: "user-2" }),
      isWorkspaceOwner: async () => false,
      createIfAbsent: async () => {
        writes++;
        return { id: "record-1", created: true };
      },
    }),
    /propriétaire non confirmé/
  );

  assert.equal(writes, 0);
});

test("une erreur de persistance est transmise sans fausse réussite", async () => {
  let writes = 0;

  await assert.rejects(
    persistDiscoveredModel("workspace-1", candidate, {
      getUser: async () => ({ id: "user-1" }),
      isWorkspaceOwner: async () => true,
      createIfAbsent: async () => {
        writes++;
        throw new Error("PERSISTENCE_INDISPONIBLE");
      },
    }),
    {
      name: "Error",
      message: "PERSISTENCE_INDISPONIBLE",
    }
  );

  assert.equal(writes, 1);
});
