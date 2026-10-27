import type { AuthorizationResult } from "./model-authorization-core";

export type ApprovalGateInput = {
  humanConfirmed: boolean;
  authorization: AuthorizationResult;
};

export function validateApprovalGate(
  input: ApprovalGateInput
): string {
  if (input.humanConfirmed !== true) {
    throw new Error("Confirmation humaine explicite requise.");
  }

  if (
    !input.authorization.authorized ||
    !input.authorization.userId?.trim()
  ) {
    throw new Error("Autorisation du propriétaire requise.");
  }

  const userId = input.authorization.userId.trim();

  if (["auto", "system"].includes(userId.toLowerCase())) {
    throw new Error("Identité humaine non valide.");
  }

  return userId;
}
