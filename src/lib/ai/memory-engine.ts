import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";
import { MemoryType } from "@/generated/prisma/enums";
import { getOrCreateDefaultWorkspace } from "@/lib/db/default-workspace";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ExtractedMemory = {
  type: "FACT" | "PREFERENCE" | "GOAL" | "CONTEXT" | "SUMMARY";
  key: string;
  content: string;
  importance: number;
};

const allowedTypes = new Set([
  "FACT",
  "PREFERENCE",
  "GOAL",
  "CONTEXT",
  "SUMMARY",
]);

function extractJsonArray(text: string): unknown[] {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {}

  const first = trimmed.indexOf("[");
  const last = trimmed.lastIndexOf("]");

  if (
    first === -1 ||
    last === -1 ||
    last <= first
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      trimmed.slice(first, last + 1)
    );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function normalizeMemory(
  raw: unknown
): ExtractedMemory | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item =
    raw as Record<string, unknown>;

  const rawType = String(
    item.type ?? ""
  ).toUpperCase();

  if (!allowedTypes.has(rawType)) {
    return null;
  }

  const key = String(
    item.key ?? ""
  ).trim();

  const content = String(
    item.content ?? ""
  ).trim();

  if (!key || !content) {
    return null;
  }

  const rawImportance =
    Number(item.importance ?? 5);

  const importance = Math.max(
    1,
    Math.min(
      10,
      Number.isFinite(rawImportance)
        ? Math.round(rawImportance)
        : 5
    )
  );

  return {
    type: rawType as ExtractedMemory["type"],
    key,
    content,
    importance,
  };
}

export async function extractMemoriesFromMessage(
  message: string
): Promise<ExtractedMemory[]> {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    return [];
  }

  const response =
    await client.responses.create({
      model: "gpt-5.6-luna",
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "developer",
          content: `
Tu es le moteur de mémoire de CreatorBusinessAI.

Analyse le message de l'utilisateur et décide s'il contient
des informations réellement utiles à retenir pour de futures
conversations.

Types autorisés :

FACT
- faits stables sur un projet, une entreprise ou une décision

PREFERENCE
- choix ou préférence durable de l'utilisateur

GOAL
- objectif important ou résultat recherché

CONTEXT
- contexte durable utile à plusieurs futures interactions

SUMMARY
- résumé durable d'une situation ou d'un projet

NE MÉMORISE PAS :
- salutations
- questions ponctuelles
- contenu temporaire
- simples exemples
- longues réponses IA
- données sensibles
- secrets
- clés API
- mots de passe
- tokens
- coordonnées privées inutiles
- détails qui n'aideront probablement pas plus tard

Importance :
1 à 3 = faible
4 à 6 = utile
7 à 8 = important
9 à 10 = essentiel

La clé doit être courte, stable et réutilisable.
Exemples :
project_name
target_market
main_goal
preferred_language
business_model

Retourne UNIQUEMENT un tableau JSON valide.

Exemple :

[
  {
    "type": "FACT",
    "key": "project_name",
    "content": "Le projet s'appelle Atlas.",
    "importance": 8
  }
]

Si rien ne mérite d'être mémorisé :

[]
          `.trim(),
        },
        {
          role: "user",
          content: cleanMessage,
        },
      ],
    });

  const rawItems =
    extractJsonArray(
      response.output_text
    );

  return rawItems
    .map(normalizeMemory)
    .filter(
      (
        item
      ): item is ExtractedMemory =>
        item !== null
    )
    .slice(0, 6);
}

export async function persistMemories(
  message: string,
  options?: {
    workspaceId?: string;
    projectId?: string | null;
  }
) {
  const workspace =
    options?.workspaceId
      ? null
      : await getOrCreateDefaultWorkspace();

  const workspaceId =
    options?.workspaceId ||
    workspace!.id;

  const projectId =
    options?.projectId || null;

  const extracted =
    await extractMemoriesFromMessage(
      message
    );

  const saved = [];

  for (const memory of extracted) {
    const existing =
      await prisma.memory.findFirst({
        where: {
          workspaceId,
          projectId,
          key: memory.key,
          type:
            memory.type as MemoryType,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    if (existing) {
      const updated =
        await prisma.memory.update({
          where: {
            id: existing.id,
          },
          data: {
            content: memory.content,
            importance:
              memory.importance,
            metadata: {
              source:
                "automatic-memory-engine",
              updatedFromMessage: true,
            },
          },
        });

      saved.push(updated);
      continue;
    }

    const created =
      await prisma.memory.create({
        data: {
          workspaceId,
          projectId,
          type:
            memory.type as MemoryType,
          key: memory.key,
          content: memory.content,
          importance:
            memory.importance,
          metadata: {
            source:
              "automatic-memory-engine",
          },
        },
      });

    saved.push(created);
  }

  return saved;
}

export async function getRelevantMemories(
  options?: {
    workspaceId?: string;
    projectId?: string | null;
    limit?: number;
  }
) {
  const workspace =
    options?.workspaceId
      ? null
      : await getOrCreateDefaultWorkspace();

  const workspaceId =
    options?.workspaceId ||
    workspace!.id;

  const projectId =
    options?.projectId || null;

  const memories =
    await prisma.memory.findMany({
      where: {
        workspaceId,
        ...(projectId
          ? {
              OR: [
                { projectId },
                { projectId: null },
              ],
            }
          : {}),
      },
      orderBy: [
        {
          importance: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take:
        Math.max(
          1,
          Math.min(
            options?.limit ?? 20,
            40
          )
        ),
    });

  return memories;
}

export async function formatRelevantMemories(
  options?: {
    workspaceId?: string;
    projectId?: string | null;
    limit?: number;
  }
) {
  const memories =
    await getRelevantMemories(
      options
    );

  if (!memories.length) {
    return "";
  }

  return memories
    .map(
      (memory) =>
        `[${memory.type}] ${memory.key || "memory"}: ${memory.content}`
    )
    .join("\n");
}
