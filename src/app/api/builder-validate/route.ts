import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { validateBuilderProject } from "@/lib/ai/builder-validator";

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

    const report =
      validateBuilderProject(
        files
      );

    return NextResponse.json({
      success: true,
      projectId,
      report,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Validate:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de valider le projet.",
      },
      { status: 500 }
    );
  }
}
