import { NextResponse } from "next/server";

import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  rollbackVercelProduction,
} from "@/lib/production-engine";

type RouteContext = {
  params: Promise<{
    deploymentId: string;
  }>;
};

export const maxDuration = 900;

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

    const body =
      await request.json().catch(
        () => null
      );

    if (
      !body ||
      body.confirmation !==
        "ROLLBACK_PRODUCTION"
    ) {
      return NextResponse.json(
        {
          error:
            "Confirmation de rollback invalide.",
        },
        { status: 400 }
      );
    }

    const { deploymentId } =
      await context.params;

    const deployment =
      await rollbackVercelProduction(
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
            : "Impossible d'exécuter le rollback.",
      },
      { status: 500 }
    );
  }
}
