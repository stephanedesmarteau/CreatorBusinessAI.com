import { NextResponse } from "next/server";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import { getDeployment } from "@/lib/production-engine/deployment-service";

type RouteContext = {
  params: Promise<{
    deploymentId: string;
  }>;
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const workspace =
      await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        {
          success: false,
          error: "Non autorisé.",
        },
        { status: 401 }
      );
    }

    const { deploymentId } =
      await context.params;

    const deployment =
      await getDeployment(
        workspace.id,
        deploymentId
      );

    if (!deployment) {
      return NextResponse.json(
        {
          success: false,
          error: "Déploiement introuvable.",
        },
        { status: 404 }
      );
    }

    const productionUrl =
      deployment.productionUrl ||
      deployment.deploymentUrl;

    if (!productionUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucune URL de production n'est enregistrée.",
        },
        { status: 400 }
      );
    }

    const startedAt = Date.now();

    const response = await fetch(
      productionUrl,
      {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      }
    );

    const durationMs =
      Date.now() - startedAt;

    const contentType =
      response.headers.get("content-type");

    const reachable =
      response.status >= 200 &&
      response.status < 400;

    return NextResponse.json({
      success: reachable,
      verification: {
        deploymentId: deployment.id,
        url: productionUrl,
        finalUrl: response.url,
        reachable,
        status: response.status,
        statusText: response.statusText,
        contentType,
        durationMs,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
