import { NextResponse } from "next/server";

import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  listDeployments,
  prepareDeployment,
} from "@/lib/production-engine";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const projectId =
      url.searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId est requis." },
        { status: 400 }
      );
    }

    const deployments = await listDeployments(
      workspace.id,
      projectId
    );

    return NextResponse.json({
      success: true,
      deployments,
    });
  } catch (error) {
    console.error(
      "Production deployments GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer les déploiements.",
      },
      { status: 500 }
    );
  }
}

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
    const projectId =
      String(body.projectId ?? "").trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId est requis." },
        { status: 400 }
      );
    }

    const result = await prepareDeployment(
      workspace.id,
      projectId
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Production deployments POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de préparer le déploiement.",
      },
      { status: 500 }
    );
  }
}
