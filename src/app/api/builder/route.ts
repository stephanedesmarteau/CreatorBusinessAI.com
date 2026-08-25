import { NextResponse } from "next/server";
import { buildProject } from "@/lib/ai/builder-engine";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateDefaultWorkspace } from "@/lib/db/default-workspace";

export const maxDuration = 300;

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const prompt =
      String(
        body.prompt ??
          body.message ??
          ""
      ).trim();

    if (!prompt) {
      return NextResponse.json(
        {
          error:
            "Veuillez décrire le projet à créer.",
        },
        { status: 400 }
      );
    }

    const workspace =
      await getOrCreateDefaultWorkspace();

    const built =
      await buildProject(prompt);

    const project =
      await prisma.project.create({
        data: {
          workspaceId:
            workspace.id,
          name: built.name,
          description:
            built.description || null,
        },
      });

    await prisma.fileAsset.createMany({
      data: built.files.map(
        (file) => ({
          workspaceId:
            workspace.id,
          projectId:
            project.id,
          name: file.path,
          mimeType:
            "text/plain",
          status: "READY",
          metadata: {
            kind: "generated-source",
            path: file.path,
            content: file.content,
            stack: built.stack,
          },
        })
      ),
    });

    return NextResponse.json({
      success: true,
      route: "builder",
      project: {
        id: project.id,
        name: project.name,
        description:
          project.description,
        stack: built.stack,
        files: built.files,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Builder:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de générer le projet.",
      },
      { status: 500 }
    );
  }
}
