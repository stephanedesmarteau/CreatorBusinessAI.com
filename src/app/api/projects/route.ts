import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

export async function GET(request: Request) {
  try {
    const currentWorkspace = await getOrCreateUserWorkspace();
    if (!currentWorkspace) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const { searchParams } =
      new URL(request.url);

    let workspaceId =
      searchParams.get("workspaceId");

    if (!workspaceId) {
      workspaceId = currentWorkspace.id;
    }
    if (workspaceId !== currentWorkspace.id) {
      return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
    }


    const projects =
      await prisma.project.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          _count: {
            select: {
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
      workspaceId,
      projects,
    });
  } catch (error) {
    console.error(
      "Erreur Projects GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les projets.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentWorkspace = await getOrCreateUserWorkspace();
    if (!currentWorkspace) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const body = await request.json();

    let workspaceId =
      String(
        body.workspaceId ?? ""
      ).trim();

    if (!workspaceId) {
      workspaceId = currentWorkspace.id;
    }

    const name = String(
      body.name ?? ""
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Le nom du projet est requis.",
        },
        { status: 400 }
      );
    }

    const project =
      await prisma.project.create({
        data: {
          workspaceId,
          name,
          description:
            String(
              body.description ?? ""
            ).trim() || null,
        },
      });

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error(
      "Erreur Projects POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de créer le projet.",
      },
      { status: 500 }
    );
  }
}
