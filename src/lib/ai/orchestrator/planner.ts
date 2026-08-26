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
      dependsOn: Array.isArray(item.dependsOn)
        ? item.dependsOn
            .map((value) => String(value).trim())
            .filter(Boolean)
        : [],
      status: "pending",
    };
  });
}


function validatePlanSteps(
  steps: OrchestratorStep[]
): OrchestratorStep[] {
  const ids = new Set(steps.map((step) => step.id));

  const sanitized = steps.map((step) => ({
    ...step,
    dependsOn: step.dependsOn.filter(
      (dependencyId) =>
        dependencyId !== step.id &&
        ids.has(dependencyId)
    ),
  }));

  const graph = new Map(
    sanitized.map((step) => [
      step.id,
      step.dependsOn,
    ])
  );

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;

    visiting.add(id);

    for (const dependencyId of graph.get(id) ?? []) {
      if (hasCycle(dependencyId)) {
        return true;
      }
    }

    visiting.delete(id);
    visited.add(id);

    return false;
  };

  for (const step of sanitized) {
    if (hasCycle(step.id)) {
      console.warn(
        "Planner: dépendance circulaire détectée. Retour au plan parallèle."
      );

      return sanitized.map((item) => ({
        ...item,
        dependsOn: [],
      }));
    }
  }

  return sanitized;
}


function inferDependencies(
  steps: OrchestratorStep[],
  strategy: string
): OrchestratorStep[] {
  if (steps.length < 2) {
    return steps;
  }

  const hasExplicitDependencies =
    steps.some(
      (step) => step.dependsOn.length > 0
    );

  if (hasExplicitDependencies) {
    return steps;
  }

  const strategyText =
    strategy.toLowerCase();

  const sequentialIntent =
    strategyText.includes("séquent") ||
    strategyText.includes("sequent") ||
    strategyText.includes("hybride") ||
    strategyText.includes("fondée sur") ||
    strategyText.includes("suivie") ||
    strategyText.includes("ensuite");

  if (!sequentialIntent) {
    return steps;
  }

  const researchSteps =
    steps.filter(
      (step) => step.agent === "research"
    );

  const priorResearchIds = (
    index: number
  ) =>
    researchSteps
      .filter(
        (item) =>
          steps.indexOf(item) < index
      )
      .map((item) => item.id);

  return steps.map((step, index) => {
    if (index === 0) {
      return step;
    }

    const researchDependencies =
      priorResearchIds(index);

    if (
      step.agent === "business" ||
      step.agent === "marketing" ||
      step.agent === "code"
    ) {
      return {
        ...step,
        dependsOn:
          researchDependencies.length > 0
            ? researchDependencies
            : [],
      };
    }

    if (step.agent === "general") {
      return {
        ...step,
        dependsOn: steps
          .slice(0, index)
          .map((item) => item.id),
      };
    }

    return {
      ...step,
      dependsOn:
        researchDependencies.length > 0
          ? researchDependencies
          : [],
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

Tu peux créer deux types de plan :

1. PARALLÈLE
Utilise plusieurs agents indépendants lorsque leurs analyses peuvent être réalisées simultanément.

2. SÉQUENTIEL / HYBRIDE
Utilise dependsOn lorsqu'une étape doit exploiter les résultats d'une étape précédente.

Règles :
- Évite les dépendances inutiles.
- Plusieurs étapes peuvent partager la même dépendance.
- Une étape peut dépendre de plusieurs étapes.
- Ne crée jamais de dépendance circulaire.
- Une étape = un objectif clair.
- Évite les étapes redondantes.
- Utilise normalement UNE SEULE étape par spécialité.
- Ne crée pas deux agents business, deux agents marketing ou deux agents research sauf nécessité exceptionnelle.
- Pour une mission business complexe standard, préfère :
  1. research
  2. business
  3. marketing
  4. general pour risques, validation et plan d'exécution
- Utilise research avant business/code/marketing lorsque des faits récents sont nécessaires.
- Une étape de validation ou critique peut dépendre d'une étape de création.
- N'utilise pas image, video ou voice ici.
- Réponds uniquement avec du JSON valide.

Format :

{
  "strategy": "stratégie courte",
  "steps": [
    {
      "title": "Analyse du marché",
      "agent": "research",
      "objective": "objectif précis",
      "dependsOn": []
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

    const strategy =
      String(parsed.strategy ?? "").trim() ||
      "Exécution parallèle multi-agents.";

    const normalizedSteps =
      validatePlanSteps(
        normalizeSteps(parsed.steps)
      );

    const steps =
      validatePlanSteps(
        inferDependencies(
          normalizedSteps,
          strategy
        )
      );

    if (!steps.length) {
      throw new Error("Aucune étape générée.");
    }

    return {
      mission,
      strategy,
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
