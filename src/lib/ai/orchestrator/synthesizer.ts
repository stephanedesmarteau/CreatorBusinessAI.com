import OpenAI from "openai";
import type {
  OrchestratorPlan,
  OrchestratorStepResult,
} from "./types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function synthesizeOrchestratorResult(
  plan: OrchestratorPlan,
  results: OrchestratorStepResult[]
) {
  const content = results
    .map(
      (step) => `
=== AGENT ${step.agent.toUpperCase()} ===
Objectif : ${step.objective}
Statut : ${step.status}

${step.output}
      `.trim()
    )
    .join("\n\n");

  const response = await client.responses.create({
    model: "gpt-5.6-terra",
    reasoning: {
      effort: "low",
    },
    max_output_tokens: 4000,
    input: [
      {
        role: "developer",
        content: `
Tu es le Chief Orchestrator de CreatorBusinessAI.

Tu reçois plusieurs analyses spécialisées exécutées en parallèle.

Ta tâche :
- fusionner les meilleures conclusions ;
- supprimer les répétitions ;
- résoudre les contradictions raisonnables ;
- distinguer faits, hypothèses et recommandations ;
- prioriser les décisions ;
- produire un plan d'action clair ;
- répondre directement à la mission de l'utilisateur ;
- rester structuré et concis ;
- conserver les éléments techniques réellement utiles ;
- produire une réponse finale complète mais sans recopier les rapports des agents ;
- privilégier les décisions, preuves, risques et prochaines actions ;
- viser une synthèse d'environ 1 500 à 2 500 mots maximum.

Ne prétends pas avoir utilisé Internet si aucune recherche Web réelle
n'a été effectuée.

Réponds en français sauf demande contraire.
        `.trim(),
      },
      {
        role: "user",
        content: `
MISSION
${plan.mission}

STRATÉGIE DU PLANNER
${plan.strategy}

ANALYSES DES AGENTS
${content}

Produis maintenant la réponse finale CreatorBusinessAI Super AI.
        `.trim(),
      },
    ],
  });

  return response.output_text;
}
