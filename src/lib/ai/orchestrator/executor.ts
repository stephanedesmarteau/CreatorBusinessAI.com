import OpenAI from "openai";
import { agentInstructions } from "@/lib/ai/agents";
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
  return ["business", "code", "research"].includes(agent)
    ? "gpt-5.6-sol"
    : "gpt-5.6-terra";
}

async function executeStep(
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
- Ne prétends pas avoir utilisé Internet si aucun moteur Web réel
  n'est connecté.
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

export async function executeOrchestratorPlan(
  plan: OrchestratorPlan
): Promise<OrchestratorStepResult[]> {
  return Promise.all(
    plan.steps.map((step) =>
      executeStep(plan.mission, step)
    )
  );
}
