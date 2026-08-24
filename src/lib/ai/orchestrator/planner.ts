import OpenAI from "openai";
import type {
  OrchestratorAgent,
  OrchestratorPlan,
  OrchestratorStep,
} from "./types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const allowedAgents: OrchestratorAgent[] = [
  "business",
  "code",
  "research",
  "marketing",
  "general",
];

function extractJson(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("JSON Planner invalide.");
  }

  return JSON.parse(trimmed.slice(first, last + 1));
}

function normalizeSteps(rawSteps: unknown): OrchestratorStep[] {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps.slice(0, 4).map((raw, index) => {
    const item =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

    const rawAgent = String(item.agent ?? "general")
      .trim()
      .toLowerCase();

    const agent: OrchestratorAgent =
      allowedAgents.includes(rawAgent as OrchestratorAgent)
        ? (rawAgent as OrchestratorAgent)
        : "general";

    return {
      id: `step-${index + 1}`,
      title:
        String(item.title ?? "").trim() ||
        `Étape ${index + 1}`,
      agent,
      objective:
        String(item.objective ?? "").trim() ||
        "Analyser cette partie de la mission.",
      dependsOn: [],
      status: "pending",
    };
  });
}

export async function createOrchestratorPlan(
  mission: string
): Promise<OrchestratorPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("La clé API OpenAI est manquante.");
  }

  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    reasoning: {
      effort: "low",
    },
    input: [
      {
        role: "developer",
        content: `
Tu es le Planner rapide de CreatorBusinessAI Super AI.

Choisis les agents réellement nécessaires parmi :

business
research
code
marketing
general

Crée entre 2 et 4 étapes maximum.

Règles :
- Toutes les étapes doivent pouvoir s'exécuter en parallèle.
- Ne crée aucune dépendance entre étapes.
- Évite les étapes redondantes.
- Une étape = un domaine clair.
- N'utilise pas image, video ou voice ici.
- Réponds uniquement avec du JSON valide.

Format :

{
  "strategy": "stratégie courte",
  "steps": [
    {
      "title": "Analyse du marché",
      "agent": "research",
      "objective": "objectif précis"
    }
  ]
}
        `.trim(),
      },
      {
        role: "user",
        content: mission,
      },
    ],
  });

  try {
    const parsed = extractJson(response.output_text);
    const steps = normalizeSteps(parsed.steps);

    if (!steps.length) {
      throw new Error("Aucune étape générée.");
    }

    return {
      mission,
      strategy:
        String(parsed.strategy ?? "").trim() ||
        "Exécution parallèle multi-agents.",
      steps,
    };
  } catch (error) {
    console.error("Planner fallback:", error);

    return {
      mission,
      strategy: "Analyse parallèle CreatorBusinessAI.",
      steps: [
        {
          id: "step-1",
          title: "Analyse stratégique",
          agent: "business",
          objective: mission,
          dependsOn: [],
          status: "pending",
        },
        {
          id: "step-2",
          title: "Analyse générale",
          agent: "general",
          objective: mission,
          dependsOn: [],
          status: "pending",
        },
      ],
    };
  }
}
