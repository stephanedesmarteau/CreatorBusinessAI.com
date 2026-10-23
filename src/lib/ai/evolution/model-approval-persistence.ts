import "server-only";

import { prisma } from "@/lib/db/prisma";
import { authorizeModelApproval } from "./model-authorization";
import { executeApprovalTransaction } from "./transactions/model-approval-transaction";

export type PersistModelApprovalInput = {
  workspaceId: string;
  modelRecordId: string;
  evaluationId: string;
  humanConfirmed: boolean;
};

export type PersistModelApprovalResult = {
  approvalId: string;
  modelRecordId: string;
  status: "APPROVED";
};

export async function persistModelApproval(
  input: PersistModelApprovalInput
): Promise<PersistModelApprovalResult> {
  if (input.humanConfirmed !== true) {
    throw new Error("Confirmation humaine explicite requise.");
  }

  const authorization = await authorizeModelApproval(
    input.workspaceId
  );

  if (!authorization.authorized || !authorization.userId) {
    throw new Error("Autorisation du propriétaire requise.");
  }

  const approvedById = authorization.userId;

  if (!approvedById) {
    throw new Error("Autorisation du propriétaire requise.");
  }

  // Blocage de securite maintenu avant toute transaction.
  throw new Error("SERVICE_NON_FINALISE");

  // Raccordement prepare, mais inaccessible tant que le blocage est actif.
  return executeApprovalTransaction(
    input,
    approvedById,
    prisma
  );
}
