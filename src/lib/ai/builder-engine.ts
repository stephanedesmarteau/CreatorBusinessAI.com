import OpenAI from "openai";
import { getAIModel } from "@/lib/ai/providers";

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
      model: getAIModel("powerful").id,
      reasoning: {
        effort: "medium",
      },
      text: {
        format: {
          type: "json_schema",
          name: "builder_project",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              stack: {
                type: "array",
                items: { type: "string" },
              },
              files: {
                type: "array",
                maxItems: 20,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    path: { type: "string" },
                    content: { type: "string" },
                  },
                  required: ["path", "content"],
                },
              },
            },
            required: ["name", "description", "stack", "files"],
          },
        },
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
- Utilise Next.js 14.2.15 pour les nouveaux projets.
- N'utilise que des options next.config compatibles avec Next.js 14.2.15.
- N'utilise pas serverExternalPackages dans Next.js 14.
- Évite les dépendances natives nécessitant node-gyp, prebuild-install ou des scripts postinstall.
- N'utilise pas better-sqlite3, sqlite3 ou d'autres modules natifs.
- Les dépendances doivent fonctionner avec npm install --ignore-scripts.
- Pour un MVP nécessitant une base de données, privilégie une architecture compatible avec une base de données externe et des variables d'environnement côté serveur, sans intégrer de secrets.
- Ne simule jamais une persistance serveur réelle si elle n'est pas implémentée.


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
- Une application générée ne doit jamais appeler directement une API authentifiée de CreatorBusinessAI comme /api/builder depuis son propre runtime.
- Ne contourne jamais l'authentification et n'intègre jamais de secret, token statique ou clé API dans le code client généré.
- Pour poursuivre vers le Builder principal, navigue vers NEXT_PUBLIC_CREATORBUSINESSAI_ORIGIN avec uniquement des identifiants non secrets comme projectId.
- Les opérations protégées doivent ensuite être exécutées depuis CreatorBusinessAI sur son origine authentifiée.
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

  const usesAtAlias = files.some(
    (file: BuilderFile) =>
      /from\s*["']@\//.test(file.content) ||
      /import\s*\(\s*["']@\//.test(file.content)
  );

  if (usesAtAlias) {
    const tsconfig = files.find(
      (file: BuilderFile) => file.path === "tsconfig.json"
    );

    if (tsconfig) {
      try {
        const config = JSON.parse(tsconfig.content);
        const options = config.compilerOptions ?? {};

        options.baseUrl ??= ".";
        options.paths ??= {};
        options.paths["@/*"] ??= ["./src/*"];

        config.compilerOptions = options;
        tsconfig.content =
          JSON.stringify(config, null, 2) + "\n";
      } catch {
        throw new Error(
          "Le tsconfig.json généré est invalide."
        );
      }
    }
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
