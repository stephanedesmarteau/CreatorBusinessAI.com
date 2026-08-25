import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type BuilderFile = {
  path: string;
  content: string;
};

export type BuilderProject = {
  name: string;
  description: string;
  stack: string[];
  files: BuilderFile[];
};

function extractJson(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (
    first === -1 ||
    last === -1 ||
    last <= first
  ) {
    throw new Error(
      "Le Builder n'a pas retourné de JSON valide."
    );
  }

  return JSON.parse(
    trimmed.slice(first, last + 1)
  );
}

function normalizePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.\.\//g, "");
}

export async function buildProject(
  request: string
): Promise<BuilderProject> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "La clé API OpenAI est manquante."
    );
  }

  const cleanRequest =
    request.trim();

  if (!cleanRequest) {
    throw new Error(
      "La demande de génération est vide."
    );
  }

  const response =
    await client.responses.create({
      model: "gpt-5.6-sol",
      reasoning: {
        effort: "medium",
      },
      input: [
        {
          role: "developer",
          content: `
Tu es CreatorBusinessAI Builder Engine.

Ta mission est de générer un PROJET LOGICIEL COMPLET
sous forme de plusieurs fichiers cohérents.

Pour cette première version, privilégie :
- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- structure simple et propre
- application fonctionnelle
- design professionnel
- responsive
- composants réutilisables
- aucune dépendance inutile

Règles :
- Génère uniquement les fichiers nécessaires.
- Maximum 20 fichiers.
- Chaque fichier doit avoir un chemin relatif sûr.
- Aucun chemin absolu.
- Aucun "../".
- Aucun secret.
- Aucun fichier .env.
- Aucun node_modules.
- Aucun lockfile.
- Aucun binaire.
- Le code doit être cohérent entre les fichiers.
- package.json doit contenir les dépendances nécessaires.
- Les imports doivent correspondre aux fichiers générés.
- Le projet doit pouvoir être installé puis lancé.
- N'utilise pas de markdown.
- Réponds UNIQUEMENT avec du JSON valide.

Format obligatoire :

{
  "name": "nom-du-projet",
  "description": "description",
  "stack": [
    "Next.js",
    "TypeScript"
  ],
  "files": [
    {
      "path": "package.json",
      "content": "..."
    },
    {
      "path": "src/app/page.tsx",
      "content": "..."
    }
  ]
}
          `.trim(),
        },
        {
          role: "user",
          content: cleanRequest,
        },
      ],
    });

  const parsed =
    extractJson(
      response.output_text
    );

  const rawFiles =
    Array.isArray(parsed.files)
      ? parsed.files
      : [];

  const files = rawFiles
    .slice(0, 20)
    .map(
      (
        raw: Record<string, unknown>
      ): BuilderFile | null => {
        const path =
          normalizePath(
            String(
              raw?.path ?? ""
            ).trim()
          );

        const content =
          String(
            raw?.content ?? ""
          );

        if (
          !path ||
          !content ||
          path.startsWith(".env") ||
          path.includes("node_modules")
        ) {
          return null;
        }

        return {
          path,
          content,
        };
      }
    )
    .filter(
      (
        file: BuilderFile | null
      ): file is BuilderFile =>
        file !== null
    );

  if (!files.length) {
    throw new Error(
      "Le Builder n'a généré aucun fichier valide."
    );
  }

  return {
    name:
      String(
        parsed.name ??
          "creatorbusinessai-project"
      )
        .trim()
        .replace(
          /[^a-zA-Z0-9-_ ]/g,
          ""
        ) ||
      "creatorbusinessai-project",

    description:
      String(
        parsed.description ?? ""
      ).trim(),

    stack:
      Array.isArray(parsed.stack)
        ? parsed.stack
            .map(
              (item: unknown) =>
                String(item).trim()
            )
            .filter(Boolean)
            .slice(0, 10)
        : [],

    files,
  };
}
