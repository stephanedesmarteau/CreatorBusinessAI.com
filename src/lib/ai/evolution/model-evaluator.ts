import type {
  EvolutionModel,
  EvolutionEvaluation,
} from "./types";

export function evaluateModel(
  model: EvolutionModel
): EvolutionEvaluation {
  const notes: string[] = [];

  const hasIdentity =
    typeof model.id === "string" &&
    Boolean(model.id.trim()) &&
    typeof model.provider === "string" &&
    Boolean(model.provider.trim()) &&
    typeof model.name === "string" &&
    Boolean(model.name.trim());

  const hasCapabilities =
    model.capabilities.length > 0;

  const compatible =
    hasIdentity &&
    hasCapabilities &&
    model.status === "DISCOVERED";

  if (!hasIdentity) {
    notes.push("Identité du modèle incomplète.");
  }

  if (!hasCapabilities) {
    notes.push("Aucune capacité déclarée.");
  }

  if (model.status !== "DISCOVERED") {
    notes.push("Statut non admissible à cette évaluation.");
  }

  notes.push(
    "Disponibilité API et capacités réelles non vérifiées."
  );

  notes.push(
    "Coût, latence et qualité non mesurés."
  );

  return {
    modelId: model.id,
    compatible,
    capabilitiesVerified: false,
    evaluatedAt: new Date().toISOString(),
    notes,
  };
}
