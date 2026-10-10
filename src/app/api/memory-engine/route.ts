import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  formatRelevantMemories,
  getRelevantMemories,
  persistMemories,
} from "@/lib/ai/memory-engine";

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
    const projectId = searchParams.get("projectId");

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

    const memories =
      await getRelevantMemories({
        workspaceId: workspace.id,
        projectId,
        limit: 30,
      });

    return NextResponse.json({
      success: true,
      memories,
    });
  } catch (error) {
    console.error(
      "Erreur Memory Engine GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer la mémoire intelligente.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const projectId =
      String(body.projectId ?? "").trim() || null;

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId: workspace.id,
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Projet introuvable ou accès interdit." },
          { status: 403 }
        );
      }
    }

    const message = String(
      body.message ?? ""
    ).trim();

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Le message est requis.",
        },
        { status: 400 }
      );
    }

    const memories =
      await persistMemories(
        message,
        {
          workspaceId: workspace.id,
          projectId,
        }
      );

    const context =
      await formatRelevantMemories({
        workspaceId: workspace.id,
        projectId,
        limit: 20,
      });

    return NextResponse.json({
      success: true,
      memories,
      context,
    });
  } catch (error) {
    console.error(
      "Erreur Memory Engine POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de mettre à jour la mémoire intelligente.",
      },
      { status: 500 }
    );
  }
}
