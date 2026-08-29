import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

export async function GET() {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: workspace.ownerId },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            projects: true,
            conversations: true,
            memories: true,
            files: true,
            agentRuns: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("Erreur Workspaces GET:", error);

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les workspaces.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentWorkspace = await getOrCreateUserWorkspace();
    if (!currentWorkspace) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const body = await request.json();

    const name = String(
      body.name ?? ""
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Le nom du workspace est requis.",
        },
        { status: 400 }
      );
    }

    const slug =
      String(body.slug ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `workspace-${Date.now()}`;

    const workspace =
      await prisma.workspace.create({
        data: {
          ownerId: currentWorkspace.ownerId,
          name,
          slug,
          description:
            String(
              body.description ?? ""
            ).trim() || null,
        },
      });

    return NextResponse.json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error(
      "Erreur Workspaces POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de créer le workspace.",
      },
      { status: 500 }
    );
  }
}
