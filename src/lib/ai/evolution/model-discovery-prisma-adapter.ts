import type { prepareDiscoveryRecord } from "./model-discovery-persistence-core";

type DiscoveryRecord = ReturnType<typeof prepareDiscoveryRecord>;

export type DiscoveryPrismaClient = {
  evolutionModelRecord: {
    create: (args: {
      data: DiscoveryRecord;
      select: { id: true };
    }) => Promise<{ id: string }>;
    findUnique: (args: {
      where: {
        workspaceId_provider_modelId: {
          workspaceId: string;
          provider: string;
          modelId: string;
        };
      };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

export async function createDiscoveredModelIfAbsent(
  record: DiscoveryRecord,
  db: DiscoveryPrismaClient
): Promise<{ id: string; created: boolean }> {
  try {
    const created = await db.evolutionModelRecord.create({
      data: {
        ...record,
        status: "DISCOVERED",
      },
      select: { id: true },
    });

    return { id: created.id, created: true };
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }

    const existing = await db.evolutionModelRecord.findUnique({
      where: {
        workspaceId_provider_modelId: {
          workspaceId: record.workspaceId,
          provider: record.provider,
          modelId: record.modelId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      throw error;
    }

    return { id: existing.id, created: false };
  }
}
