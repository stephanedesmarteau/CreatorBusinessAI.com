import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateDefaultWorkspace } from "@/lib/db/default-workspace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId");
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      const workspace = await getOrCreateDefaultWorkspace();
      workspaceId = workspace.id;
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
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
    const body = await request.json();

    let workspaceId = String(body.workspaceId ?? "").trim();

    if (!workspaceId) {
      const workspace = await getOrCreateDefaultWorkspace();
      workspaceId = workspace.id;
    }

    const projectId =
      String(body.projectId ?? "").trim() || null;

    const title =
      String(body.title ?? "").trim() ||
      "Nouvelle conversation";

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
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
