import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function getOrCreateUserWorkspace() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const existing = await prisma.workspace.findFirst({
    where: {
      ownerId: user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      ownerId: user.id,
      name: "Mon Workspace CreatorBusinessAI",
      slug: `creatorbusinessai-${user.id}`,
      description: "Workspace personnel CreatorBusinessAI.",
    },
  });
}
