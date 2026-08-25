import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateDefaultWorkspace } from "@/lib/db/default-workspace";

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    let workspaceId =
      searchParams.get("workspaceId");

    if (!workspaceId) {
      const workspace =
        await getOrCreateDefaultWorkspace();

      workspaceId = workspace.id;
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
    const body = await request.json();

    let workspaceId =
      String(
        body.workspaceId ?? ""
      ).trim();

    if (!workspaceId) {
      const workspace =
        await getOrCreateDefaultWorkspace();

      workspaceId = workspace.id;
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
