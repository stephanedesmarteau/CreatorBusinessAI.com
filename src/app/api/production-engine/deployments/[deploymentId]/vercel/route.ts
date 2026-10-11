import { NextResponse } from "next/server";

import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

import {
  deployToVercelProduction,
  prepareVercelDryRun,
} from "@/lib/production-engine";

type RouteContext = {
  params: Promise<{
    deploymentId: string;
  }>;
};

export const maxDuration = 900;

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

    const dryRun =
      await prepareVercelDryRun(
        workspace.id,
        deploymentId
      );

    return NextResponse.json({
      success: true,
      dryRun,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de préparer Vercel.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const deployment =
      await deployToVercelProduction(
        workspace.id,
        deploymentId
      );

    return NextResponse.json({
      success: true,
      deployment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de déployer sur Vercel.",
      },
      { status: 500 }
    );
  }
}
