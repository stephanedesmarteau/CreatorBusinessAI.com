import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runBuilderBuild } from "@/lib/ai/builder-build-runner";

export const maxDuration = 300;

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const projectId =
      String(
        body.projectId ?? ""
      ).trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId est requis.",
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

    const files =
      project.files
        .map((file) => {
          const metadata =
            file.metadata &&
            typeof file.metadata ===
              "object"
              ? (
                  file.metadata as Record<
                    string,
                    unknown
                  >
                )
              : {};

          return {
            path:
              file.name,
            content:
              String(
                metadata.content ??
                  ""
              ),
          };
        })
        .filter(
          (file) =>
            file.path &&
            file.content
        );

    if (!files.length) {
      return NextResponse.json(
        {
          error:
            "Aucun fichier à compiler.",
        },
        { status: 400 }
      );
    }

    const result =
      await runBuilderBuild(
        files
      );

    return NextResponse.json({
      success: true,
      projectId,
      build: result,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Build:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de compiler le projet.",
      },
      { status: 500 }
    );
  }
}
