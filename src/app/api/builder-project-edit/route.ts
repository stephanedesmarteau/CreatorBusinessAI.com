import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  editBuilderProject,
  type ProjectEditorFile,
} from "@/lib/ai/builder-project-editor";

export const maxDuration = 300;

export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const projectId =
      String(
        body.projectId ?? ""
      ).trim();

    const instruction =
      String(
        body.instruction ?? ""
      ).trim();

    if (
      !projectId ||
      !instruction
    ) {
      return NextResponse.json(
        {
          error:
            "projectId et instruction sont requis.",
        },
        { status: 400 }
      );
    }

    const project =
      await prisma.project.findUnique({
        where: {
          id: projectId,
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

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Projet introuvable.",
        },
        { status: 404 }
      );
    }

    const currentFiles: ProjectEditorFile[] =
      project.files
        .map((file) => {
          const metadata =
            file.metadata &&
            typeof file.metadata === "object"
              ? (
                  file.metadata as Record<
                    string,
                    unknown
                  >
                )
              : {};

          return {
            path: file.name,
            content: String(
              metadata.content ?? ""
            ),
          };
        })
        .filter(
          (file) =>
            file.path &&
            file.content
        );

    if (!currentFiles.length) {
      return NextResponse.json(
        {
          error:
            "Le projet ne contient aucun fichier modifiable.",
        },
        { status: 400 }
      );
    }

    const result =
      await editBuilderProject(
        instruction,
        currentFiles
      );

    const existingByPath =
      new Map(
        project.files.map(
          (file) => [
            file.name,
            file,
          ]
        )
      );

    await prisma.$transaction(
      async (tx) => {
        for (
          const changedFile
          of result.files
        ) {
          const existing =
            existingByPath.get(
              changedFile.path
            );

          if (existing) {
            const oldMetadata =
              existing.metadata &&
              typeof existing.metadata ===
                "object"
                ? (
                    existing.metadata as Record<
                      string,
                      unknown
                    >
                  )
                : {};

            await tx.fileAsset.update({
              where: {
                id: existing.id,
              },
              data: {
                metadata: {
                  ...oldMetadata,
                  kind:
                    "generated-source",
                  path:
                    changedFile.path,
                  content:
                    changedFile.content,
                  updatedBy:
                    "builder-project-editor",
                  updatedAt:
                    new Date().toISOString(),
                },
              },
            });

            continue;
          }

          await tx.fileAsset.create({
            data: {
              workspaceId:
                project.workspaceId,
              projectId:
                project.id,
              name:
                changedFile.path,
              mimeType:
                "text/plain",
              status:
                "READY",
              metadata: {
                kind:
                  "generated-source",
                path:
                  changedFile.path,
                content:
                  changedFile.content,
                createdBy:
                  "builder-project-editor",
                createdAt:
                  new Date().toISOString(),
              },
            },
          });
        }
      }
    );

    const updatedProject =
      await prisma.project.findUnique({
        where: {
          id: project.id,
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

    const files =
      updatedProject?.files.map(
        (file) => {
          const metadata =
            file.metadata &&
            typeof file.metadata === "object"
              ? (
                  file.metadata as Record<
                    string,
                    unknown
                  >
                )
              : {};

          return {
            id: file.id,
            path: file.name,
            content: String(
              metadata.content ?? ""
            ),
          };
        }
      ) ?? [];

    return NextResponse.json({
      success: true,
      projectId:
        project.id,
      summary:
        result.summary,
      plan:
        result.plan,
      changedFiles:
        result.files.map(
          (file) => file.path
        ),
      files,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Project Editor:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le projet.",
      },
      { status: 500 }
    );
  }
}
