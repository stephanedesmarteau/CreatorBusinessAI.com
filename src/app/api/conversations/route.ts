import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

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

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId: workspace.id,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      conversations,
    });
  } catch (error) {
    console.error("Erreur Conversations GET:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les conversations." },
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

    const title =
      String(body.title ?? "").trim() ||
      "Nouvelle conversation";

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        projectId,
        title,
      },
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Erreur Conversations POST:", error);

    return NextResponse.json(
      { error: "Impossible de créer la conversation." },
      { status: 500 }
    );
  }
}
