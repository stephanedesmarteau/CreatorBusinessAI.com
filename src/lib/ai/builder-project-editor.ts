import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ProjectEditorFile = {
  path: string;
  content: string;
};

export type ProjectEditorResult = {
  summary: string;
  plan: string[];
  files: ProjectEditorFile[];
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
      "L'agent développeur n'a pas retourné de JSON valide."
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

export async function editBuilderProject(
  instruction: string,
  currentFiles: ProjectEditorFile[]
): Promise<ProjectEditorResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "La clé API OpenAI est manquante."
    );
  }

  const cleanInstruction =
    instruction.trim();

  if (!cleanInstruction) {
    throw new Error(
      "L'instruction de modification est vide."
    );
  }

  const source = currentFiles
    .map(
      (file) => `
===== ${file.path} =====
${file.content}
      `.trim()
    )
    .join("\n\n");

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
Tu es l'Agent Développeur autonome de CreatorBusinessAI.

Tu travailles sur un projet logiciel existant composé
de plusieurs fichiers.

Ta mission :
1. analyser la demande ;
2. analyser les fichiers existants ;
3. produire un plan court ;
4. déterminer exactement quels fichiers doivent changer ;
5. retourner le contenu COMPLET des fichiers modifiés ;
6. créer de nouveaux fichiers seulement si nécessaire.

Règles absolues :
- conserve l'architecture existante ;
- ne modifie pas les fichiers sans raison ;
- les imports doivent rester cohérents ;
- aucun chemin absolu ;
- aucun "../" ;
- aucun secret ;
- aucun .env ;
- aucun node_modules ;
- aucun fichier binaire ;
- maximum 20 fichiers modifiés ou créés ;
- retourne uniquement les fichiers qui changent ;
- chaque contenu doit être le fichier COMPLET final ;
- ne retourne aucun markdown ;
- réponds UNIQUEMENT avec du JSON valide.

Format obligatoire :

{
  "summary": "résumé de la modification",
  "plan": [
    "étape 1",
    "étape 2"
  ],
  "files": [
    {
      "path": "src/app/page.tsx",
      "content": "contenu complet final"
    }
  ]
}
          `.trim(),
        },
        {
          role: "user",
          content: `
INSTRUCTION

${cleanInstruction}

PROJET ACTUEL

${source}
          `.trim(),
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
      ): ProjectEditorFile | null => {
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
        file: ProjectEditorFile | null
      ): file is ProjectEditorFile =>
        file !== null
    );

  if (!files.length) {
    throw new Error(
      "L'agent développeur n'a proposé aucune modification valide."
    );
  }

  return {
    summary:
      String(
        parsed.summary ??
          "Projet mis à jour."
      ).trim(),

    plan:
      Array.isArray(parsed.plan)
        ? parsed.plan
            .map(
              (item: unknown) =>
                String(item).trim()
            )
            .filter(Boolean)
            .slice(0, 20)
        : [],

    files,
  };
}
