import { prisma } from "@/lib/db/prisma";

export async function getOrCreateDefaultWorkspace() {
  const slug = "creatorbusinessai-default";

  const existing = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      name: "CreatorBusinessAI Workspace",
      slug,
      description:
        "Workspace principal de CreatorBusinessAI.",
    },
  });
}
