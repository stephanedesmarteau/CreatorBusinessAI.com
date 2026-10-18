import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

const KIND = "studionova-project";
const ASSET_NAME = "studionova/project.json";

function validData(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export async function GET() {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const assets = await prisma.fileAsset.findMany({
      where: {
        workspaceId: workspace.id,
        name: ASSET_NAME,
      },
      include: {
        project: {
          select: { id: true, name: true, workspaceId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const projects = assets
      .filter((asset) => {
        const metadata = asset.metadata;
        return (
          validData(metadata) &&
          metadata.kind === KIND &&
          asset.project?.workspaceId === workspace.id
        );
      })
      .map((asset) => ({
        projectId: asset.projectId,
        name: asset.project?.name,
        data: (asset.metadata as Record<string, unknown>).data,
        updatedAt: asset.updatedAt,
      }));

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("StudioNova GET:", error);
    return NextResponse.json(
      { error: "Impossible de charger les projets StudioNova." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const rawBody = await request.text();

    if (rawBody.length > 100000) {
      return NextResponse.json(
        { error: "Données StudioNova trop volumineuses." },
        { status: 413 }
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = JSON.parse(rawBody);

      if (!validData(parsed)) {
        throw new Error("Invalid body");
      }

      body = parsed;
    } catch {
      return NextResponse.json(
        { error: "Corps JSON invalide." },
        { status: 400 }
      );
    }

    const projectId = String(body.projectId ?? "").trim();
    const data = body.data;

    if (!validData(data)) {
      return NextResponse.json(
        { error: "Données StudioNova invalides." },
        { status: 400 }
      );
    }

    const name = String(data.business ?? "").trim().slice(0, 120);

    if (!name) {
      return NextResponse.json(
        { error: "Nom de l'entreprise requis." },
        { status: 400 }
      );
    }

    const metadata = {
      kind: KIND,
      data: JSON.parse(JSON.stringify(data)),
    };

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId: workspace.id },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Projet introuvable ou accès interdit." },
          { status: 403 }
        );
      }

      const asset = await prisma.fileAsset.findFirst({
        where: {
          workspaceId: workspace.id,
          projectId,
          name: ASSET_NAME,
        },
      });

      if (
        !asset ||
        !validData(asset.metadata) ||
        asset.metadata.kind !== KIND
      ) {
        return NextResponse.json(
          { error: "Ce projet n'est pas un projet StudioNova." },
          { status: 409 }
        );
      }

      await prisma.fileAsset.update({
        where: { id: asset.id },
        data: { metadata },
      });

      return NextResponse.json({ success: true, projectId });
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId: workspace.id,
          name,
          description: "Projet créé avec StudioNova",
        },
      });

      await tx.fileAsset.create({
        data: {
          workspaceId: workspace.id,
          projectId: created.id,
          name: ASSET_NAME,
          mimeType: "application/json",
          status: "UPLOADED",
          metadata,
        },
      });

      return created;
    });

    return NextResponse.json(
      { success: true, projectId: project.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("StudioNova POST:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le projet StudioNova." },
      { status: 500 }
    );
  }
}
