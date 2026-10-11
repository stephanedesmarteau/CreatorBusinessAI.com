import { NextResponse } from "next/server";

import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  getDeployment,
  prepareRollback,
  transitionDeployment,
} from "@/lib/production-engine";

type RouteContext = {
  params: Promise<{
    deploymentId: string;
  }>;
};

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

    const deployment = await getDeployment(
      workspace.id,
      deploymentId
    );

    if (!deployment) {
      return NextResponse.json(
        { error: "Déploiement introuvable." },
        { status: 404 }
      );
    }

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
            : "Impossible de récupérer le déploiement.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();

    if (body.action === "prepare-rollback") {
      const rollback = await prepareRollback(
        workspace.id,
        deploymentId
      );

      return NextResponse.json({
        success: true,
        rollback,
      });
    }

    const status =
      String(body.status ?? "").trim();

    const allowed = [
      "PREPARING",
      "READY",
      "DEPLOYING",
      "DEPLOYED",
      "FAILED",
      "ROLLING_BACK",
      "ROLLED_BACK",
    ] as const;

    if (
      !allowed.includes(
        status as (typeof allowed)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Statut invalide." },
        { status: 400 }
      );
    }

    const deployment =
      await transitionDeployment(
        workspace.id,
        deploymentId,
        status as (typeof allowed)[number],
        {
          productionUrl:
            body.productionUrl ?? undefined,
          deploymentUrl:
            body.deploymentUrl ?? undefined,
          commitSha:
            body.commitSha ?? undefined,
          providerData:
            body.providerData ?? undefined,
          logs:
            body.logs ?? undefined,
          error:
            body.error ?? undefined,
        }
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
            : "Impossible de modifier le déploiement.",
      },
      { status: 500 }
    );
  }
}
