import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiscoveredModelIfAbsent,
  type DiscoveryPrismaClient,
} from "../../../src/lib/ai/evolution/model-discovery-prisma-adapter";

const record = {
  workspaceId: "workspace-1",
  provider: "provider-test",
  modelId: "model-test",
  name: "Modèle de test",
  tier: "balanced" as const,
  capabilities: ["text" as const],
  status: "DISCOVERED" as const,
};

test("un nouveau modèle est créé avec le statut DISCOVERED", async () => {
  const db = {
    evolutionModelRecord: {
      create: async ({ data }: { data: typeof record }) => {
        assert.equal(data.status, "DISCOVERED");
        return { id: "record-1" };
      },
      findUnique: async () => null,
    },
  } as DiscoveryPrismaClient;

  const result = await createDiscoveredModelIfAbsent(record, db);
  assert.deepEqual(result, { id: "record-1", created: true });
});

test("un doublon conserve le modèle existant", async () => {
  let lookups = 0;

  const db = {
    evolutionModelRecord: {
      create: async () => {
        throw { code: "P2002" };
      },
      findUnique: async () => {
        lookups++;
        return { id: "existing-1" };
      },
    },
  } as DiscoveryPrismaClient;

  const result = await createDiscoveredModelIfAbsent(record, db);

  assert.deepEqual(result, {
    id: "existing-1",
    created: false,
  });
  assert.equal(lookups, 1);
});

test("une erreur Prisma inattendue est propagée", async () => {
  const failure = new Error("DATABASE_UNAVAILABLE");
  let lookups = 0;

  const db = {
    evolutionModelRecord: {
      create: async () => {
        throw failure;
      },
      findUnique: async () => {
        lookups++;
        return null;
      },
    },
  } as DiscoveryPrismaClient;

  await assert.rejects(
    createDiscoveredModelIfAbsent(record, db),
    (error: unknown) => error === failure
  );

  assert.equal(lookups, 0);
});
