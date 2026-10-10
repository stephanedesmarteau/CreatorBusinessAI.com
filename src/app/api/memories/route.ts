import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MemoryType } from "@/generated/prisma/enums";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

const allowedTypes = new Set([
  "FACT",
  "PREFERENCE",
  "GOAL",
  "CONTEXT",
  "SUMMARY",
]);

export async function GET(request: Request) {
  try {
    const workspace = await getOrCreateUserWorkspace();
    if (!workspace) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("projectId");

    const workspaceId = workspace.id;

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId,
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

    const memories = await prisma.memory.findMany({
      where: {
        workspaceId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [
        {
          importance: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      memories,
    });
  } catch (error) {
    console.error("Erreur Memories GET:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer la mémoire." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const workspaceId = workspace.id;

    const projectId =
      String(body.projectId ?? "").trim() || null;

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId,
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

    const content =
      String(body.content ?? "").trim();

    if (!content) {
      return NextResponse.json(
        { error: "Le contenu de la mémoire est requis." },
        { status: 400 }
      );
    }

    const rawType =
      String(body.type ?? "CONTEXT").toUpperCase();

    if (!allowedTypes.has(rawType)) {
      return NextResponse.json(
        { error: "Type de mémoire invalide." },
        { status: 400 }
      );
    }

    const rawImportance = Number(body.importance ?? 5);

    const importance = Math.max(
      1,
      Math.min(
        10,
        Number.isFinite(rawImportance)
          ? Math.round(rawImportance)
          : 5
      )
    );

    const memory = await prisma.memory.create({
      data: {
        workspaceId,
        projectId,
        type: rawType as MemoryType,
        key:
          String(body.key ?? "").trim() || null,
        content,
        importance,
        metadata: body.metadata ?? undefined,
      },
    });

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error("Erreur Memories POST:", error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer la mémoire." },
      { status: 500 }
    );
  }
}
