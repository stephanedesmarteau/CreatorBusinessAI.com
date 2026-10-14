import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  editBuilderProject,
  type ProjectEditorFile,
} from "@/lib/ai/builder-project-editor";
import {
  BUILDER_REPAIR_LIMIT,
  canReserveRepair,
  isBuilderOperationType,
  isRepairOperation,
} from "@/lib/ai/builder-operation-policy";

export const maxDuration = 300;

export async function PATCH(
  request: Request
) {
  let operationId: string | null =
    null;

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

    const operationType =
      body.operationType;

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

    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const project =
      await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId: workspace.id,
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

    if (
      !isBuilderOperationType(
        operationType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Type d'opération Builder invalide.",
        },
        { status: 400 }
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

    if (
      isRepairOperation(
        operationType
      )
    ) {
      const attemptsUsed =
        await prisma.builderAiOperation.count({
          where: {
            workspaceId:
              workspace.id,
            projectId:
              project.id,
            operationType: {
              in: [
                "build-repair",
                "validation-repair",
              ],
            },
          },
        });

      if (
        !canReserveRepair(
          attemptsUsed
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Limite de ${BUILDER_REPAIR_LIMIT} réparations IA atteinte pour ce projet.`,
          },
          { status: 409 }
        );
      }
    }

    const operation =
      await prisma.builderAiOperation.create({
        data: {
          workspaceId:
            workspace.id,
          projectId:
            project.id,
          operationType,
          status:
            "RESERVED",
        },
      });

    operationId =
      operation.id;

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
        await tx.projectVersion.create({
          data: {
            projectId: project.id,
            label: "Avant modification IA",
            description:
              result.summary ||
              instruction,
            files: currentFiles,
          },
        });

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

    await prisma.builderAiOperation.update({
      where: {
        id: operation.id,
      },
      data: {
        status:
          "COMPLETED",
      },
    });

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
    if (operationId) {
      try {
        await prisma.builderAiOperation.updateMany({
          where: {
            id: operationId,
            status:
              "RESERVED",
          },
          data: {
            status:
              "FAILED",
          },
        });
      } catch (operationError) {
        console.error(
          "Erreur statut opération Builder:",
          operationError
        );
      }
    }

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
