import { NextResponse } from "next/server";

import {
  createProductionPlan,
} from "@/lib/production-engine";

import {
  loadProductionProject,
} from "@/lib/production-engine/project-loader";

import {
  getOrCreateUserWorkspace,
} from "@/lib/db/user-workspace";

export async function GET(
  request: Request
) {
  try {
    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        {
          error: "Non autorisé.",
        },
        {
          status: 401,
        }
      );
    }

    const url = new URL(request.url);

    const projectId =
      String(
        url.searchParams.get(
          "projectId"
        ) ?? ""
      ).trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId est requis.",
        },
        {
          status: 400,
        }
      );
    }

    const project =
      await loadProductionProject(
        workspace.id,
        projectId
      );

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Projet introuvable ou accès interdit.",
        },
        {
          status: 404,
        }
      );
    }

    const plan =
      createProductionPlan(project);

    return NextResponse.json({
      success: true,
      plan,
      context: {
        workspaceId:
          workspace.id,
        projectId:
          project.projectId,
        persisted: false,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Production Engine:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'analyser le projet pour la production.",
      },
      {
        status: 500,
      }
    );
  }
}
