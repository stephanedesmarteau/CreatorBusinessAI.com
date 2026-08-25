import OpenAI from "openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300;

type SourceFile = {
  path: string;
  content: string;
};

type PreviewPage = {
  route: string;
  title: string;
  html: string;
};

function cleanHtml(text: string) {
  return text
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function routeFromPagePath(path: string) {
  const normalized =
    path.replace(/\\/g, "/");

  if (
    normalized ===
    "src/app/page.tsx"
  ) {
    return "/";
  }

  const prefix = "src/app/";
  const suffix = "/page.tsx";

  if (
    normalized.startsWith(prefix) &&
    normalized.endsWith(suffix)
  ) {
    const middle =
      normalized.slice(
        prefix.length,
        -suffix.length
      );

    return `/${middle}`
      .replace(/\/+/g, "/");
  }

  return null;
}

function pageTitle(route: string) {
  if (route === "/") {
    return "Accueil";
  }

  return route
    .split("/")
    .filter(Boolean)
    .map(
      (segment) =>
        segment
          .replace(/-/g, " ")
          .replace(
            /\b\w/g,
            (char) =>
              char.toUpperCase()
          )
    )
    .join(" / ");
}

async function generatePagePreview(
  projectName: string,
  description: string,
  route: string,
  files: SourceFile[]
): Promise<PreviewPage> {
  let totalCharacters = 0;

  const sourceParts: string[] = [];

  for (const file of files) {
    let content = file.content;

    if (!content) {
      continue;
    }

    const remaining =
      70000 - totalCharacters;

    if (remaining <= 0) {
      break;
    }

    if (
      content.length >
      remaining
    ) {
      content =
        content.slice(
          0,
          remaining
        );
    }

    totalCharacters +=
      content.length;

    sourceParts.push(`
===== ${file.path} =====

${content}
    `.trim());
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
Tu es le moteur Live Preview multi-pages de CreatorBusinessAI.

Tu transformes une page React / Next.js / Tailwind
en un document HTML autonome pour iframe sandbox.

La route actuellement rendue est :

${route}

Règles :
- reproduis fidèlement la page correspondant à cette route ;
- conserve le design original ;
- utilise les composants fournis ;
- reproduis navigation, formulaires, hero, sections,
  tarifs, FAQ, CTA et footer lorsque pertinents ;
- rends l'interface responsive ;
- convertis les classes Tailwind nécessaires en CSS autonome ;
- conserve les interactions simples ;
- aucune dépendance npm ;
- aucun appel serveur réel ;
- aucun secret ;
- aucun iframe imbriqué ;
- aucun localStorage ;
- aucun accès parent/top ;
- aucun script externe nécessaire ;
- utilise HTML, CSS et JavaScript navigateur simples.

NAVIGATION MULTI-PAGES :
- conserve les liens internes utilisant des routes comme
  "/", "/contact", "/pricing", etc. ;
- ajoute l'attribut data-preview-route aux liens internes ;
- exemple :
  <a href="/contact" data-preview-route="/contact">Contact</a>
- ne transforme pas /contact en #contact ;
- les ancres de la page courante peuvent rester #section.

Retourne uniquement le HTML complet.
Commence par <!DOCTYPE html>.
          `.trim(),
        },
        {
          role: "user",
          content: `
PROJET
${projectName}

DESCRIPTION
${description}

ROUTE À AFFICHER
${route}

FICHIERS SOURCE

${sourceParts.join("\n\n")}

Crée l'aperçu HTML autonome de cette route.
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
      `Aperçu HTML invalide pour ${route}.`
    );
  }

  return {
    route,
    title:
      pageTitle(route),
    html,
  };
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

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

    const sourceFiles: SourceFile[] =
      project.files
        .map((file) => {
          const metadata =
            file.metadata &&
            typeof file.metadata ===
              "object"
              ? (
                  file.metadata as Record<
                    string,
                    unknown
                  >
                )
              : {};

          return {
            path: file.name,
            content: String(
              metadata.content ?? ""
            ),
          };
        })
        .filter(
          (file) =>
            file.path &&
            file.content
        );

    const pageFiles =
      sourceFiles.filter(
        (file) =>
          routeFromPagePath(
            file.path
          ) !== null
      );

    if (!pageFiles.length) {
      return NextResponse.json(
        {
          error:
            "Aucune page Next.js détectée.",
        },
        { status: 400 }
      );
    }

    const sharedFiles =
      sourceFiles.filter(
        (file) =>
          file.path ===
            "src/app/globals.css" ||
          file.path ===
            "src/app/layout.tsx" ||
          file.path.startsWith(
            "src/components/"
          )
      );

    const detectedRoutes =
      pageFiles
        .map((file) => ({
          route:
            routeFromPagePath(
              file.path
            )!,
          file,
        }))
        .slice(0, 8);

    const pages: PreviewPage[] =
      [];

    for (
      const page
      of detectedRoutes
    ) {
      const relevantFiles = [
        ...sharedFiles,
        page.file,
      ];

      const preview =
        await generatePagePreview(
          project.name,
          project.description || "",
          page.route,
          relevantFiles
        );

      pages.push(preview);
    }

    return NextResponse.json({
      success: true,
      projectId,
      defaultRoute:
        pages.some(
          (page) =>
            page.route === "/"
        )
          ? "/"
          : pages[0].route,
      routes:
        pages.map(
          (page) => ({
            route: page.route,
            title: page.title,
          })
        ),
      pages,
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
            : "Impossible de générer l'aperçu multi-pages.",
      },
      { status: 500 }
    );
  }
}
