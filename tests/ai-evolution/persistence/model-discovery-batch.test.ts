import test from "node:test";
import assert from "node:assert/strict";

import {
  persistDiscoveredModelsBatch,
} from "../../../src/lib/ai/evolution/model-discovery-batch";

import type {
  DiscoveredModelCandidate,
} from "../../../src/lib/ai/evolution/model-discovery";

import type {
  DiscoveryPersistenceDependencies,
} from "../../../src/lib/ai/evolution/model-discovery-persistence-service";

test("le lot distingue les découvertes et les doublons", async () => {
  const candidates: DiscoveredModelCandidate[] = [
    {
      id: "model-a",
      provider: "provider-a",
      name: "Model A",
      tier: "fast",
      capabilities: ["text"],
      source: "test",
    },
    {
      id: "model-b",
      provider: "provider-a",
      name: "Model B",
      tier: "fast",
      capabilities: ["text"],
      source: "test",
    },
    {
      id: "model-a",
      provider: "provider-a",
      name: "Model A",
      tier: "fast",
      capabilities: ["text"],
      source: "test",
    },
  ];

  const seen = new Set<string>();

  const dependencies: DiscoveryPersistenceDependencies = {
    getUser: async () => ({ id: "owner-1" }),
    isWorkspaceOwner: async () => true,
    createIfAbsent: async (record) => {
      const key = `${record.provider}:${record.modelId}`;
      const created = !seen.has(key);
      seen.add(key);
      return { id: key, created };
    },
  };

  const result = await persistDiscoveredModelsBatch(
    "workspace-1",
    candidates,
    dependencies
  );

  assert.deepEqual(result, {
    discovered: 2,
    skipped: 1,
    rejected: 0,
  });
});

test("un utilisateur non authentifié ne peut enregistrer aucun modèle du lot", async () => {
  let writes = 0;

  const dependencies: DiscoveryPersistenceDependencies = {
    getUser: async () => null,
    isWorkspaceOwner: async () => true,
    createIfAbsent: async () => {
      writes++;
      return { id: "unexpected", created: true };
    },
  };

  const candidate: DiscoveredModelCandidate = {
    id: "model-secure",
    provider: "provider-a",
    name: "Secure Model",
    tier: "fast",
    capabilities: ["text"],
    source: "test",
  };

  await assert.rejects(
    persistDiscoveredModelsBatch(
      "workspace-1",
      [candidate, candidate],
      dependencies
    ),
    /Authentification requise/
  );

  assert.equal(writes, 0);
});

test("un non-propriétaire ne peut enregistrer aucun modèle du lot", async () => {
  let writes = 0;

  const dependencies: DiscoveryPersistenceDependencies = {
    getUser: async () => ({ id: "other-user" }),
    isWorkspaceOwner: async () => false,
    createIfAbsent: async () => {
      writes++;
      return { id: "unexpected", created: true };
    },
  };

  const candidate: DiscoveredModelCandidate = {
    id: "model-protected",
    provider: "provider-a",
    name: "Protected Model",
    tier: "fast",
    capabilities: ["text"],
    source: "test",
  };

  await assert.rejects(
    persistDiscoveredModelsBatch(
      "workspace-1",
      [candidate],
      dependencies
    ),
    /Accès refusé/
  );

  assert.equal(writes, 0);
});

test("une erreur de persistance interrompt le lot", async () => {
  const failure = new Error("DATABASE_UNAVAILABLE");
  let writes = 0;

  const dependencies: DiscoveryPersistenceDependencies = {
    getUser: async () => ({ id: "owner-1" }),
    isWorkspaceOwner: async () => true,
    createIfAbsent: async () => {
      writes++;
      throw failure;
    },
  };

  const candidate: DiscoveredModelCandidate = {
    id: "model-failure",
    provider: "provider-a",
    name: "Failure Model",
    tier: "fast",
    capabilities: ["text"],
    source: "test",
  };

  await assert.rejects(
    persistDiscoveredModelsBatch(
      "workspace-1",
      [candidate, candidate],
      dependencies
    ),
    (error: unknown) => error === failure
  );

  assert.equal(writes, 1);
});
