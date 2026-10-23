import type { EvolutionModel, EvolutionEvaluation, EvolutionDecision } from "./types";
import { decideModelApproval } from "./model-decision";
import type { AuthorizationResult } from "./model-authorization-core";

export function approveEvaluatedModel(
  model: EvolutionModel,
  evaluation: EvolutionEvaluation,
  authorization: AuthorizationResult,
  humanConfirmed: boolean
): EvolutionDecision {
  if (!authorization.authorized || !authorization.userId) {
    return {
      modelId: model.id,
      approved: false,
      approvedBy: "NON_AUTORISE",
      decidedAt: new Date().toISOString(),
      reason: "Autorisation du proprietaire requise.",
    };
  }
  if (humanConfirmed !== true) {
    return {
      modelId: model.id,
      approved: false,
      approvedBy: authorization.userId,
      decidedAt: new Date().toISOString(),
      reason: "Confirmation humaine explicite requise.",
    };
  }
  return decideModelApproval(model, evaluation, authorization.userId);
}
