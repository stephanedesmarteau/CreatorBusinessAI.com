import type {
  EvolutionModel,
  EvolutionEvaluation,
  EvolutionDecision,
} from "./types";

export function decideModelApproval(
  model: EvolutionModel,
  evaluation: EvolutionEvaluation,
  approvedBy: string
): EvolutionDecision {
  const reviewer = approvedBy.trim();

  const validEvaluation =
    evaluation.modelId === model.id &&
    evaluation.compatible === true &&
    evaluation.capabilitiesVerified === true;

  const authorized =
    reviewer.length > 0 &&
    reviewer !== "auto" &&
    reviewer !== "system";

  const approved =
    model.status === "EVALUATED" &&
    validEvaluation &&
    authorized;

  let reason = "Approbation autorisée.";

  if (model.status !== "EVALUATED") {
    reason = "Le modèle doit être évalué avant approbation.";
  } else if (!validEvaluation) {
    reason = "Évaluation insuffisante ou capacités non vérifiées.";
  } else if (!authorized) {
    reason = "Une approbation humaine explicite est requise.";
  }

  return {
    modelId: model.id,
    approved,
    approvedBy: reviewer || "NON_AUTORISE",
    decidedAt: new Date().toISOString(),
    reason,
  };
}
