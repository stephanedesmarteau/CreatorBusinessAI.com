import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateDefaultWorkspace } from "@/lib/db/default-workspace";

export async function GET() {
  try {
    const workspace =
      await getOrCreateDefaultWorkspace();

    const projects =
      await prisma.project.findMany({
        where: {
          workspaceId:
            workspace.id,
          files: {
            some: {
              metadata: {
                path: [
                  "kind"
                ],
                equals:
                  "generated-source",
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
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
        },
      });

    const normalized =
      projects.map(
        (project) => ({
          id: project.id,
          name: project.name,
          description:
            project.description,
          createdAt:
            project.createdAt,
          files:
            project.files.map(
              (file) => {
                const metadata =
                  file.metadata &&
                  typeof file.metadata === "object"
                    ? file.metadata
                    : {};

                return {
                  id: file.id,
                  path:
                    file.name,
                  metadata,
                };
              }
            ),
        })
      );

    return NextResponse.json({
      success: true,
      projects: normalized,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Projects GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les projets générés.",
      },
      { status: 500 }
    );
  }
}
