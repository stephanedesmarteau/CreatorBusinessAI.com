import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getRuntimeStatus,
  startRuntime,
  stopRuntime,
} from "@/lib/ai/builder-runtime";

export const maxDuration = 300;

function getProjectId(
  request: Request
) {
  const url =
    new URL(request.url);

  return String(
    url.searchParams.get(
      "projectId"
    ) ?? ""
  ).trim();
}

export async function GET(
  request: Request
) {
  const projectId =
    getProjectId(
      request
    );

  if (!projectId) {
    return NextResponse.json(
      {
        error:
          "projectId est requis.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    runtime:
      getRuntimeStatus(
        projectId
      ),
  });
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const projectId =
      String(
        body.projectId ??
          ""
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
              status:
                "READY",
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

    const runtime =
      await startRuntime(
        project.id,
        files
      );

    return NextResponse.json({
      success: true,
      runtime,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Runtime:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de démarrer le projet.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const projectId =
      getProjectId(
        request
      );

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId est requis.",
        },
        { status: 400 }
      );
    }

    const runtime =
      await stopRuntime(
        projectId
      );

    return NextResponse.json({
      success: true,
      runtime,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Runtime Stop:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'arrêter le runtime.",
      },
      { status: 500 }
    );
  }
}
