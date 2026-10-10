import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import { buildProject } from "@/lib/ai/builder-engine";
import {
  createBusinessFactoryBuildHandoff,
  type BusinessFactorySpec,
} from "@/lib/ai/business-factory";

export const maxDuration = 300;

export async function POST(request: Request) {
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

    const built =
      await buildProject(handoff.prompt);

    /*
     * Toujours créer un NOUVEAU projet.
     * Ne jamais réutiliser sourceProjectId ici.
     */
    const project =
      await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: built.name,
          description:
            built.description || null,
        },
      });

    try {
      await prisma.fileAsset.createMany({
        data: built.files.map((file) => ({
          workspaceId: workspace.id,
          projectId: project.id,
          name: file.path,
          mimeType: "text/plain",
          status: "READY",
          metadata: {
            kind: "generated-source",
            path: file.path,
            content: file.content,
            stack: built.stack,
            source:
              "business-factory",
            sourceProjectId:
              handoff.sourceProjectId,
          },
        })),
      });
    } catch (error) {
      /*
       * Évite de conserver un projet vide
       * si la sauvegarde des fichiers échoue.
       */
      await prisma.project.delete({
        where: {
          id: project.id,
        },
      });

      throw error;
    }

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
    console.error(
      "Erreur Business Factory Build:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de construire le projet.",
      },
      { status: 500 }
    );
  }
}
