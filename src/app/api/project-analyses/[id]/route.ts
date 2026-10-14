import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const analysis = await prisma.projectAnalysis.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analyse introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Erreur ProjectAnalysis GET [id]:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer l’analyse." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const analysis = await prisma.projectAnalysis.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analyse introuvable." },
        { status: 404 }
      );
    }

    await prisma.projectAnalysis.delete({
      where: {
        id: analysis.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Erreur ProjectAnalysis DELETE:", error);

    return NextResponse.json(
      { error: "Impossible de supprimer l’analyse." },
      { status: 500 }
    );
    }
}
