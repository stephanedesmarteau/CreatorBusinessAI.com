import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = cleanString(searchParams.get("projectId"));

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Projet introuvable ou accès interdit." },
          { status: 403 }
        );
      }
    }

    const analyses = await prisma.projectAnalysis.findMany({
      where: {
        workspaceId: workspace.id,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      analyses,
    });
  } catch (error) {
    console.error("Erreur ProjectAnalysis GET:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les analyses." },
      { status: 500 }
    );
  }
}

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

    const localId = cleanString(body.localId);
    const projectId = cleanString(body.projectId) || null;
    const projectName = cleanString(body.projectName);
    const description = cleanString(body.description);
    const sector = cleanString(body.sector);
    const targetMarket = cleanString(body.targetMarket);
    const mainGoal = cleanString(body.mainGoal);
    const result = body.result;

    if (
      !localId ||
      !projectName ||
      !description ||
      !sector ||
      !targetMarket ||
      !mainGoal ||
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      return NextResponse.json(
        { error: "Données d’analyse invalides ou incomplètes." },
        { status: 400 }
      );
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Projet introuvable ou accès interdit." },
          { status: 403 }
        );
      }
    }

    const analysis = await prisma.projectAnalysis.upsert({
      where: {
        workspaceId_localId: {
          workspaceId: workspace.id,
          localId,
        },
      },
      update: {
        projectId,
        projectName,
        description,
        sector,
        targetMarket,
        mainGoal,
        result,
      },
      create: {
        workspaceId: workspace.id,
        projectId,
        localId,
        projectName,
        description,
        sector,
        targetMarket,
        mainGoal,
        result,
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Erreur ProjectAnalysis POST:", error);

    return NextResponse.json(
      { error: "Impossible d’enregistrer l’analyse." },
      { status: 500 }
    );
  }
}
