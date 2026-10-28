import "server-only";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db/prisma";

import type { DiscoveredModelCandidate } from "./model-discovery";
import { persistDiscoveredModel } from "./model-discovery-persistence-service";
import { createDiscoveredModelIfAbsent } from "./model-discovery-prisma-adapter";

export async function persistModelDiscovery(
  workspaceId: string,
  candidate: DiscoveredModelCandidate
) {
  return persistDiscoveredModel(workspaceId, candidate, {
    getUser: async () => {
      const user = await getCurrentUser();
      return user ? { id: user.id } : null;
    },

    isWorkspaceOwner: async (id, userId) => {
      const workspace = await prisma.workspace.findFirst({
        where: { id, ownerId: userId },
        select: { id: true },
      });

      return workspace !== null;
    },

    createIfAbsent: (record) =>
      createDiscoveredModelIfAbsent(record, prisma),
  });
}
