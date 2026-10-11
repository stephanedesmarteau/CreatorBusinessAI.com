import { NextResponse } from "next/server";

import {
  getOrCreateUserWorkspace,
} from "@/lib/db/user-workspace";

import {
  prepareGitHubPublication,
  publishDeploymentToGitHub,
} from "@/lib/production-engine";

type RouteContext = {
  params: Promise<{
    deploymentId: string;
  }>;
};

export const maxDuration = 300;

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const { deploymentId } =
      await context.params;

    const preparation =
      await prepareGitHubPublication(
        workspace.id,
        deploymentId
      );

    return NextResponse.json({
      success: true,
      preparation: {
        deploymentId:
          preparation.deploymentId,
        projectId:
          preparation.projectId,
        projectName:
          preparation.projectName,
        owner:
          preparation.owner,
        repository:
          preparation.repository,
        fullName:
          preparation.fullName,
        branch:
          preparation.branch,
        description:
          preparation.description,
        private:
          preparation.private,
        fileCount:
          preparation.fileCount,
        files:
          preparation.files.map(
            (file) => file.path
          ),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de préparer la publication GitHub.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const { deploymentId } =
      await context.params;

    const body =
      await request.json().catch(
        () => ({})
      );

    const result =
      await publishDeploymentToGitHub(
        workspace.id,
        deploymentId,
        {
          owner:
            typeof body.owner === "string"
              ? body.owner
              : undefined,
          repository:
            typeof body.repository ===
            "string"
              ? body.repository
              : undefined,
          private:
            typeof body.private ===
            "boolean"
              ? body.private
              : true,
          allowExistingRepository:
            body.allowExistingRepository ===
            true,
        }
      );

    return NextResponse.json({
      success: true,
      publication: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de publier sur GitHub.",
      },
      { status: 500 }
    );
  }
}
