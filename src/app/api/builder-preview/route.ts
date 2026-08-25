import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300;

function cleanHtml(text: string) {
  return text
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const projectId = String(
      body.projectId ?? ""
    ).trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            "projectId est requis.",
        },
        { status: 400 }
      );
    }

    const project =
      await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          files: {
            where: {
              status: "READY",
            },
            orderBy: {
              name: "asc",
            },
          },
        },
      });

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Projet introuvable.",
        },
        { status: 404 }
      );
    }

    const usefulFiles =
      project.files
        .filter((file) => {
          const name =
            file.name.toLowerCase();

          return (
            name === "src/app/page.tsx" ||
            name === "src/app/globals.css" ||
            name === "src/app/layout.tsx" ||
            name.startsWith(
              "src/components/"
            )
          );
        })
        .slice(0, 20);

    let totalCharacters = 0;

    const sourceParts: string[] = [];

    for (const file of usefulFiles) {
      const metadata =
        file.metadata &&
        typeof file.metadata === "object"
          ? (file.metadata as Record<
              string,
              unknown
            >)
          : {};

      let content = String(
        metadata.content ?? ""
      );

      if (!content) {
        continue;
      }

      const remaining =
        70000 - totalCharacters;

      if (remaining <= 0) {
        break;
      }

      if (content.length > remaining) {
        content =
          content.slice(0, remaining);
      }

      totalCharacters += content.length;

      sourceParts.push(`
===== ${file.name} =====

${content}
      `.trim());
    }

    if (!sourceParts.length) {
      return NextResponse.json(
        {
          error:
            "Aucun fichier visuel utilisable pour l'aperçu.",
        },
        { status: 400 }
      );
    }

    const response =
      await client.responses.create({
        model: "gpt-5.6-terra",
        reasoning: {
          effort: "low",
        },
        input: [
          {
            role: "developer",
            content: `
Tu es le moteur Live Preview de CreatorBusinessAI.

Tu reçois les fichiers React / Next.js / Tailwind
d'un projet généré.

Ta mission :
transformer fidèlement l'interface en UN SEUL
document HTML autonome affichable dans un iframe.

Règles :
- conserve au maximum le design original ;
- reproduis navigation, hero, fonctionnalités,
  tarifs, FAQ, CTA et footer si présents ;
- rends le résultat responsive ;
- transforme les classes Tailwind nécessaires
  en CSS autonome si nécessaire ;
- conserve les interactions simples comme FAQ,
  boutons et navigation interne ;
- aucune dépendance npm ;
- aucun appel serveur ;
- aucun secret ;
- aucun iframe imbriqué ;
- aucun accès localStorage ;
- aucun accès parent/top ;
- aucun script externe nécessaire ;
- utilise uniquement HTML, CSS et JavaScript
  navigateur simples ;
- retourne uniquement le HTML complet ;
- commence par <!DOCTYPE html>.
            `.trim(),
          },
          {
            role: "user",
            content: `
PROJET
${project.name}

DESCRIPTION
${project.description || ""}

FICHIERS SOURCE

${sourceParts.join("\n\n")}

Crée maintenant l'aperçu HTML autonome.
            `.trim(),
          },
        ],
      });

    const html =
      cleanHtml(
        response.output_text
      );

    if (
      !html ||
      !html
        .toLowerCase()
        .includes("<html")
    ) {
      throw new Error(
        "Le moteur Preview n'a pas retourné un document HTML valide."
      );
    }

    return NextResponse.json({
      success: true,
      projectId,
      html,
    });
  } catch (error) {
    console.error(
      "Erreur Builder Preview:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de générer l'aperçu.",
      },
      { status: 500 }
    );
  }
}
