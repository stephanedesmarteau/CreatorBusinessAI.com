import { isBuilderExecutionAllowed } from "@/lib/ai/builder-execution-policy";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  runBuilderBuild,
  takeCachedBuilderBuild,
} from "@/lib/ai/builder-build-runner";
import { startRuntime } from "@/lib/ai/builder-runtime";
import { validateBuilderProject } from "@/lib/ai/builder-validator";
import { applyCreatorBusinessTestPreset } from "@/lib/ai/builder-presets/creatorbusinessai-test";

export const maxDuration = 300;

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

    const workspace = await getOrCreateUserWorkspace();
    if (!workspace) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

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
            orderBy: [
              { createdAt: "asc" },
              { id: "asc" },
            ],
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

    const selectedFiles = new Map<
      string,
      (typeof project.files)[number]
    >();

    for (const file of project.files) {
      if (!selectedFiles.has(file.name)) {
        selectedFiles.set(file.name, file);
      }
    }

    const files =
      [...selectedFiles.values()]
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

    const seenPaths = new Set<string>();
    const duplicatePaths = new Set<string>();

    for (const file of files) {
      if (seenPaths.has(file.path)) {
        duplicatePaths.add(file.path);
      }
      seenPaths.add(file.path);
    }

    if (duplicatePaths.size > 0) {
      return NextResponse.json(
        {
          error:
            "Compilation bloquée : fichiers dupliqués détectés.",
          duplicatePaths: [...duplicatePaths].sort(),
        },
        { status: 409 }
      );
    }

    const buildFiles =
      await applyCreatorBusinessTestPreset(
        projectId,
        files
      );

    const validation = validateBuilderProject(buildFiles);

    const compatibilityIssues = validation.issues.filter(
      (issue) =>
        issue.severity === "error" &&
        [
          "UNSUPPORTED_NATIVE_DEPENDENCY",
          "INCOMPATIBLE_NEXT_CONFIG",
        ].includes(issue.code)
    );

    if (compatibilityIssues.length > 0) {
      return NextResponse.json(
        {
          error:
            "Compilation bloquée : dépendances ou configuration incompatibles.",
          issues: compatibilityIssues,
        },
        { status: 422 }
      );
    }

    const result =
      await runBuilderBuild(
        projectId,
        buildFiles
      );

    let runtime = null;

    if (result.success) {
      const cachedBuild =
        takeCachedBuilderBuild(
          projectId
        );

      runtime =
        await startRuntime(
          projectId,
          buildFiles,
          cachedBuild?.root
        );
    }

    return NextResponse.json({
      success: true,
      projectId,
      build: result,
      runtime,
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
