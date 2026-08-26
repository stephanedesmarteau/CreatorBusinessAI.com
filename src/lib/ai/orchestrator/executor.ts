import OpenAI from "openai";
import { agentInstructions } from "@/lib/ai/agents";
import { researchWeb } from "@/lib/ai/research-engine";
import type {
  OrchestratorAgent,
  OrchestratorPlan,
  OrchestratorStep,
  OrchestratorStepResult,
} from "./types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getModel(agent: OrchestratorAgent) {
  return ["business", "code"].includes(agent)
    ? "gpt-5.6-sol"
    : "gpt-5.6-terra";
}

async function executeResearchStep(
  mission: string,
  step: OrchestratorStep
): Promise<OrchestratorStepResult> {
  try {
    const research = await researchWeb(`
MISSION GLOBALE
${mission}

OBJECTIF DE RECHERCHE
${step.objective}

Effectue une recherche Web réelle et récente.
Privilégie les sources officielles, primaires et fiables.
Produis une synthèse exploitable par les autres agents.
    `.trim());

    const sourcesText =
      research.sources.length > 0
        ? research.sources
            .map(
              (source, index) =>
                `[${index + 1}] ${source.title} — ${source.url}`
            )
            .join("\n")
        : "Aucune source structurée retournée.";

    return {
      id: step.id,
      title: step.title,
      agent: step.agent,
      objective: step.objective,
      status: "completed",
      output: `
${research.text}

SOURCES WEB
${sourcesText}
      `.trim(),
    };
  } catch (error) {
    console.error(
      "Erreur Research Web Orchestrator:",
      error
    );

    return {
      id: step.id,
      title: step.title,
      agent: step.agent,
      objective: step.objective,
      status: "failed",
      output:
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la recherche Web.",
    };
  }
}

async function executeStandardStep(
  mission: string,
  step: OrchestratorStep
): Promise<OrchestratorStepResult> {
  try {
    const response = await client.responses.create({
      model: getModel(step.agent),
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "developer",
          content: `
${agentInstructions[step.agent] ||
  agentInstructions.general ||
  "Réponds utilement."}

Tu es un agent spécialisé du Super Orchestrator CreatorBusinessAI.

Tu travailles EN PARALLÈLE avec d'autres agents.

Règles :
- Exécute uniquement ton domaine.
- Ne refais pas le travail des autres agents.
- Va directement aux décisions à forte valeur.
- Sois concret, précis et exploitable.
- Évite les longues introductions.
- Fournis une sortie que le Chief Orchestrator pourra fusionner.
          `.trim(),
        },
        {
          role: "user",
          content: `
MISSION GLOBALE
${mission}

TON AGENT
${step.agent}

TON OBJECTIF
${step.objective}

Produis ton analyse spécialisée.
          `.trim(),
        },
      ],
    });

    return {
      id: step.id,
      title: step.title,
      agent: step.agent,
      objective: step.objective,
      status: "completed",
      output:
        response.output_text ||
        "Étape terminée sans contenu textuel.",
    };
  } catch (error) {
    console.error(
      `Erreur Orchestrator agent ${step.agent}:`,
      error
    );

    return {
      id: step.id,
      title: step.title,
      agent: step.agent,
      objective: step.objective,
      status: "failed",
      output:
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant l'étape.",
    };
  }
}

async function executeStep(
  mission: string,
  step: OrchestratorStep
): Promise<OrchestratorStepResult> {
  if (step.agent === "research") {
    return executeResearchStep(
      mission,
      step
    );
  }

  return executeStandardStep(
    mission,
    step
  );
}

export async function executeOrchestratorPlan(
  plan: OrchestratorPlan
): Promise<OrchestratorStepResult[]> {
  const pending = new Map(
    plan.steps.map((step) => [
      step.id,
      step,
    ])
  );

  const results = new Map<
    string,
    OrchestratorStepResult
  >();

  while (pending.size > 0) {
    const ready = Array.from(
      pending.values()
    ).filter((step) =>
      step.dependsOn.every((dependencyId) =>
        results.has(dependencyId)
      )
    );

    if (ready.length === 0) {
      const blocked = Array.from(
        pending.values()
      ).map((step) => ({
        id: step.id,
        dependsOn: step.dependsOn,
      }));

      throw new Error(
        `Plan Orchestrator bloqué ou dépendance invalide: ${JSON.stringify(
          blocked
        )}`
      );
    }

    const waveResults = await Promise.all(
      ready.map(async (step) => {
        const dependencyContext =
          step.dependsOn.length > 0
            ? step.dependsOn
                .map((dependencyId) => {
                  const dependency =
                    results.get(
                      dependencyId
                    );

                  if (!dependency) {
                    return "";
                  }

                  return `
=== RÉSULTAT ${dependency.title} ===
Agent : ${dependency.agent}
Statut : ${dependency.status}

${dependency.output}
                  `.trim();
                })
                .filter(Boolean)
                .join("\n\n")
            : "";

        const enrichedStep: OrchestratorStep =
          dependencyContext
            ? {
                ...step,
                objective: `
${step.objective}

CONTEXTE DES ÉTAPES PRÉCÉDENTES
${dependencyContext}

Utilise ces résultats comme contexte.
Ne les répète pas inutilement.
                `.trim(),
              }
            : step;

        return executeStep(
          plan.mission,
          enrichedStep
        );
      })
    );

    for (const result of waveResults) {
      results.set(result.id, result);
      pending.delete(result.id);
    }
  }

  return plan.steps
    .map((step) => results.get(step.id))
    .filter(
      (
        result
      ): result is OrchestratorStepResult =>
        Boolean(result)
    );
}
