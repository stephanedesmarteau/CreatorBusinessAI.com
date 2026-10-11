import { prisma } from "@/lib/db/prisma";

import type {
  ProductionFile,
  ProductionProjectSnapshot,
} from "./types";

function readMetadata(
  metadata: unknown
): Record<string, unknown> {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

export async function loadProductionProject(
  workspaceId: string,
  projectId: string
): Promise<ProductionProjectSnapshot | null> {
  const project =
    await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      include: {
        files: {
          where: {
            status: "READY",
          },
          orderBy: {
            name: "asc",
          },
        },
        versions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

  if (!project) {
    return null;
  }

  const files: ProductionFile[] =
    project.files
      .map((file) => {
        const metadata =
          readMetadata(file.metadata);

        if (
          metadata.kind !==
          "generated-source"
        ) {
          return null;
        }

        const content =
          typeof metadata.content ===
          "string"
            ? metadata.content
            : "";

        if (!content) {
          return null;
        }

        return {
          path: file.name,
          content,
        };
      })
      .filter(
        (
          file
        ): file is ProductionFile =>
          file !== null
      );

  return {
    projectId: project.id,
    projectName: project.name,
    files,
    versionId:
      project.versions[0]?.id ?? null,
  };
}
