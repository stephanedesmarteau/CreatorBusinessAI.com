import "server-only";

import { prisma } from "@/lib/db/prisma";
import { authorizeModelApproval } from "./model-authorization";
import { validateApprovalGate } from "./model-approval-gate";
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

  const approvedById = validateApprovalGate({
    humanConfirmed: input.humanConfirmed,
    authorization,
  });

  // Blocage de securite maintenu avant toute transaction.
  throw new Error("SERVICE_NON_FINALISE");

  // Raccordement prepare, mais inaccessible tant que le blocage est actif.
  return executeApprovalTransaction(
    input,
    approvedById,
    prisma
  );
}
