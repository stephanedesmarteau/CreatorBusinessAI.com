import { NextResponse } from "next/server";
import { validateBuilderProject } from "@/lib/ai/builder-validator";

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

    let operation;

    for (
      let transactionAttempt = 0;
      transactionAttempt < 3;
      transactionAttempt += 1
    ) {
      try {
        operation =
          await prisma.$transaction(
            async (tx) => {
              if (
                isRepairOperation(
                  operationType
                )
              ) {
                const attemptsUsed =
                  await tx.builderAiOperation.count({
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
                  throw new Error(
                    "BUILDER_REPAIR_LIMIT_REACHED"
                  );
                }
              }

              return tx.builderAiOperation.create({
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
            },
            {
              isolationLevel:
                "Serializable",
            }
          );

        break;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "BUILDER_REPAIR_LIMIT_REACHED"
        ) {
          return NextResponse.json(
            {
              error:
                `Limite de ${BUILDER_REPAIR_LIMIT} réparations IA atteinte pour ce projet.`,
            },
            { status: 409 }
          );
        }

        const code =
          error &&
          typeof error === "object" &&
          "code" in error
            ? String(
                (
                  error as {
                    code?: unknown;
                  }
                ).code ?? ""
              )
            : "";

        if (
          code === "P2034" &&
          transactionAttempt < 2
        ) {
          continue;
        }

        throw error;
      }
    }

    if (!operation) {
      throw new Error(
        "Impossible de réserver l'opération Builder."
      );
    }

    operationId =
      operation.id;

    const result =
      await editBuilderProject(
        instruction,
        currentFiles
      );

    const compatibilityCodes = new Set([
      "UNSUPPORTED_NATIVE_DEPENDENCY",
      "INCOMPATIBLE_NEXT_CONFIG",
    ]);

    const proposedFiles = new Map(
      currentFiles.map((file) => [file.path, file])
    );

    for (const file of result.files) {
      proposedFiles.set(file.path, file);
    }

    const before = validateBuilderProject(currentFiles);
    const after = validateBuilderProject(
      Array.from(proposedFiles.values())
    );

    const issueKey = (issue: {
      code: string;
      file?: string;
      message: string;
    }) => `${issue.code}|${issue.file ?? ""}|${issue.message}`;

    const existingIssues = new Set(
      before.issues
        .filter((issue) =>
          issue.severity === "error" &&
          compatibilityCodes.has(issue.code)
        )
        .map(issueKey)
    );

    const newIssues = after.issues.filter(
      (issue) =>
        issue.severity === "error" &&
        compatibilityCodes.has(issue.code) &&
        !existingIssues.has(issueKey(issue))
    );

    if (newIssues.length > 0) {
      await prisma.builderAiOperation.updateMany({
        where: {
          id: operation.id,
          status: "RESERVED",
        },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          error:
            "Modification IA refusée : nouvelles incompatibilités détectées.",
          issues: newIssues,
        },
        { status: 422 }
      );
    }

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
