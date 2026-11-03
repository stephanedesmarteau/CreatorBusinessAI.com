import { isBuilderExecutionAllowed } from "@/lib/ai/builder-execution-policy";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  getRuntimeStatus,
  startRuntime,
  stopRuntime,
} from "@/lib/ai/builder-runtime";
import {
  takeCachedBuilderBuild,
} from "@/lib/ai/builder-build-runner";

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

  const workspace = await getOrCreateUserWorkspace();

  if (!workspace) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: workspace.id,
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Projet introuvable." },
      { status: 404 }
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
  if (!isBuilderExecutionAllowed()) {
    return NextResponse.json(
      {
        error: "BUILDER_EXECUTION_DISABLED",
        message: "Execution des projets desactivee en production.",
      },
      { status: 503 }
    );
  }

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

    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
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

    const cachedBuild =
      takeCachedBuilderBuild(
        project.id
      );

    const runtime =
      await startRuntime(
        project.id,
        files,
        cachedBuild?.root
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

    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
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
