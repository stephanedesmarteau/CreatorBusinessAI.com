import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const fileId = String(body.fileId ?? "").trim();
    const instruction = String(body.instruction ?? "").trim();

    if (!fileId || !instruction) {
      return NextResponse.json(
        {
          error:
            "fileId et instruction sont requis.",
        },
        { status: 400 }
      );
    }

    const file = await prisma.fileAsset.findUnique({
      where: {
        id: fileId,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Fichier introuvable." },
        { status: 404 }
      );
    }

    const metadata =
      file.metadata && typeof file.metadata === "object"
        ? (file.metadata as Record<string, unknown>)
        : {};

    const currentContent = String(metadata.content ?? "");

    if (!currentContent) {
      return NextResponse.json(
        { error: "Le fichier ne contient aucun code modifiable." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5.6-sol",
      reasoning: {
        effort: "medium",
      },
      input: [
        {
          role: "developer",
          content: `
Tu es le Builder File Editor de CreatorBusinessAI.

Tu modifies UN SEUL fichier existant.

Règles :
- conserve la cohérence avec le code existant ;
- applique uniquement l'instruction demandée ;
- ne change pas inutilement l'architecture ;
- ne retourne pas de markdown ;
- ne retourne pas d'explication ;
- retourne uniquement le contenu final complet du fichier.
          `.trim(),
        },
        {
          role: "user",
          content: `
FICHIER
${file.name}

CONTENU ACTUEL
${currentContent}

MODIFICATION DEMANDÉE
${instruction}

Retourne le contenu final complet du fichier.
          `.trim(),
        },
      ],
    });

    const nextContent = response.output_text.trim();

    if (!nextContent) {
      throw new Error(
        "Le moteur d'édition n'a retourné aucun contenu."
      );
    }

    const updated = await prisma.fileAsset.update({
      where: {
        id: file.id,
      },
      data: {
        metadata: {
          ...metadata,
          content: nextContent,
          updatedBy: "builder-file-editor",
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: updated.id,
        path: updated.name,
        content: nextContent,
      },
    });
  } catch (error) {
    console.error("Erreur Builder File:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le fichier.",
      },
      { status: 500 }
    );
  }
}
