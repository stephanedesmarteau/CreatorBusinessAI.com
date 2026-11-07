import { NextResponse } from "next/server";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  executeBusinessFactory,
  type BusinessFactorySpec,
} from "@/lib/ai/business-factory";

export const maxDuration = 900;

export async function POST(request: Request) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const factory =
      body?.factory as BusinessFactorySpec | undefined;

    if (
      !factory ||
      !factory.project ||
      !factory.project.name ||
      !Array.isArray(factory.deliverables) ||
      factory.deliverables.length > 12
    ) {
      return NextResponse.json(
        {
          error:
            "Une Business Factory valide est requise.",
        },
        { status: 400 }
      );
    }

    const execution =
      await executeBusinessFactory(factory);

    return NextResponse.json({
      success: execution.status !== "failed",
      execution,
      context: {
        workspaceId: workspace.id,
        projectId:
          factory.project.projectId || null,
        persisted: false,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Business Factory Execute:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'exécuter la Business Factory.",
      },
      { status: 500 }
    );
  }
}
