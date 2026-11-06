import { createHash } from "node:crypto";
import { canonicalizeBusinessFactory } from "@/lib/business-factory-canonical";
import { decideBusinessFactoryReservation } from "@/lib/business-factory-idempotency";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import { buildProject } from "@/lib/ai/builder-engine";
import {
  createBusinessFactoryBuildHandoff,
  type BusinessFactorySpec,
} from "@/lib/ai/business-factory";

export const maxDuration = 300;

function hashBusinessFactory(
  factory: BusinessFactorySpec
): string {
  return createHash("sha256")
    .update(canonicalizeBusinessFactory(factory))
    .digest("hex");
}

function isPrismaUniqueConstraintError(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  let reservationId: string | null = null;

  try {
    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const factory =
      body.factory as BusinessFactorySpec | undefined;

    const idempotencyKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (
      !/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)
    ) {
      return NextResponse.json(
        { error: "Clé d'idempotence invalide ou manquante." },
        { status: 400 }
      );
    }

    if (!factory?.project?.name) {
      return NextResponse.json(
        {
          error:
            "Business Factory invalide ou manquante.",
        },
        { status: 400 }
      );
    }

    /*
     * Sécurité fondamentale:
     * le projectId contenu dans la Factory représente
     * uniquement le projet SOURCE.
     *
     * Il ne doit jamais être utilisé comme projet
     * de destination pour les fichiers générés.
     */
    const handoff =
      createBusinessFactoryBuildHandoff(factory);

    const requestHash = hashBusinessFactory(factory);

    if (handoff.sourceProjectId) {
      const sourceProject = await prisma.project.findFirst({
        where: {
          id: handoff.sourceProjectId,
          workspaceId: workspace.id,
        },
        select: {
          id: true,
        },
      });

      if (!sourceProject) {
        return NextResponse.json(
          {
            error:
              "Projet source introuvable ou accès interdit.",
          },
          { status: 403 }
        );
      }
    }

    try {
      const reservation =
        await prisma.businessFactoryBuildRequest.create({
          data: {
            workspaceId: workspace.id,
            idempotencyKey,
            requestHash,
            sourceProjectId: handoff.sourceProjectId,
            status: "RESERVED",
          },
        });

      reservationId = reservation.id;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const existing =
          await prisma.businessFactoryBuildRequest.findUnique({
            where: {
              workspaceId_idempotencyKey: {
                workspaceId: workspace.id,
                idempotencyKey,
              },
            },
          });

        if (!existing) {
          return NextResponse.json(
            { error: "Réservation introuvable. Réessayez." },
            { status: 409 }
          );
        }

        if (
          !existing.requestHash ||
          existing.requestHash !== requestHash
        ) {
          return NextResponse.json(
            {
              error:
                "Clé déjà utilisée pour un plan Business Factory différent ou non vérifiable.",
            },
            { status: 409 }
          );
        }

        if (existing.sourceProjectId !== handoff.sourceProjectId) {
          return NextResponse.json(
            { error: "Clé déjà utilisée pour un autre projet source." },
            { status: 409 }
          );
        }

        if (
          existing.status === "COMPLETED" &&
          existing.generatedProjectId
        ) {
          const generated = await prisma.project.findFirst({
            where: {
              id: existing.generatedProjectId,
              workspaceId: workspace.id,
            },
            select: {
              id: true,
              name: true,
              description: true,
            },
          });

          if (generated) {
            return NextResponse.json({
              success: true,
              reused: true,
              project: generated,
            });
          }
        }

        const potentiallyInterrupted =
          decideBusinessFactoryReservation(
            existing,
            requestHash,
            handoff.sourceProjectId
          ) === "INTERRUPTED";

        return NextResponse.json(
          {
            error: potentiallyInterrupted
              ? "Cette construction est ancienne et pourrait avoir été interrompue. Aucune nouvelle génération n'a été lancée."
              : existing.status === "FAILED"
                ? "Cette construction a échoué."
                : "Cette construction est déjà enregistrée.",
            status: existing.status,
            potentiallyInterrupted,
          },
          { status: 409 }
        );
      }

      throw error;
    }

    const built =
      await buildProject(handoff.prompt);

    /*
     * Toujours créer un NOUVEAU projet.
     * Ne jamais réutiliser sourceProjectId ici.
     */
    const project = await prisma.$transaction(
      async (tx) => {
        const created = await tx.project.create({
          data: {
            workspaceId: workspace.id,
            name: built.name,
            description: built.description || null,
          },
        });

        await tx.fileAsset.createMany({
          data: built.files.map((file) => ({
            workspaceId: workspace.id,
            projectId: created.id,
            name: file.path,
            mimeType: "text/plain",
            status: "READY",
            metadata: {
              kind: "generated-source",
              path: file.path,
              content: file.content,
              stack: built.stack,
              source: "business-factory",
              sourceProjectId: handoff.sourceProjectId,
            },
          })),
        });

        await tx.businessFactoryBuildRequest.update({
          where: {
            workspaceId_idempotencyKey: {
              workspaceId: workspace.id,
              idempotencyKey,
            },
          },
          data: {
            generatedProjectId: created.id,
            status: "COMPLETED",
            error: null,
          },
        });

        return created;
      }
    );

    return NextResponse.json({
      success: true,

      source: {
        projectId:
          handoff.sourceProjectId,
      },

      handoff: {
        createNewProject:
          handoff.createNewProject,
        recommendedProduct:
          handoff.recommendedProduct,
      },

      project: {
        id: project.id,
        name: project.name,
        description:
          project.description,
        stack: built.stack,
        fileCount:
          built.files.length,
        files: built.files,
      },
    });
  } catch (error) {
    if (reservationId) {
      try {
        await prisma.businessFactoryBuildRequest.updateMany({
          where: {
            id: reservationId,
            status: "RESERVED",
          },
          data: {
            status: "FAILED",
            error:
              error instanceof Error
                ? error.message.slice(0, 2000)
                : "Erreur de construction inconnue.",
          },
        });
      } catch (reservationError) {
        console.error(
          "Erreur de mise à jour de réservation:",
          reservationError
        );
      }
    }

    console.error(
      "Erreur Business Factory Build:",
      error
    );

    return NextResponse.json(
      {
        error: "Impossible de construire le projet.",
      },
      { status: 500 }
    );
  }
}
