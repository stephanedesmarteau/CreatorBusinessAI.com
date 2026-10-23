import "server-only";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db/prisma";
import { authorizeModelApprovalCore } from "./model-authorization-core";

export type ModelAuthorizationResult = {
  authorized: boolean;
  userId: string | null;
  reason: string;
};

export async function authorizeModelApproval(
  workspaceId: string
): Promise<ModelAuthorizationResult> {
  return authorizeModelApprovalCore(workspaceId, {
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
  });
}
