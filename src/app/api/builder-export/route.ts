import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = String(searchParams.get("projectId") ?? "").trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId est requis." },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: {
          where: { status: "READY" },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projet introuvable." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (const file of project.files) {
      const metadata =
        file.metadata && typeof file.metadata === "object"
          ? (file.metadata as Record<string, unknown>)
          : {};

      const content = String(metadata.content ?? "");

      if (!content) continue;

      zip.file(file.name, content);
    }

    const buffer = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    const safeName = project.name
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-");

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName || "creatorbusinessai-project"}.zip"`,
      },
    });
  } catch (error) {
    console.error("Erreur Builder Export:", error);

    return NextResponse.json(
      { error: "Impossible d'exporter le projet." },
      { status: 500 }
    );
  }
}
