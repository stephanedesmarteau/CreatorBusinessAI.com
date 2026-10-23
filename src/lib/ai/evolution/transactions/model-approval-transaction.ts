import { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/db/prisma";
import type {
  PersistModelApprovalInput,
  PersistModelApprovalResult,
} from "../model-approval-persistence";

function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

export async function executeApprovalTransaction(
  input: PersistModelApprovalInput,
  approvedById: string,
  database: Pick<typeof prisma, "$transaction">
): Promise<PersistModelApprovalResult> {
  if (input.humanConfirmed !== true) {
    throw new Error("CONFIRMATION_HUMAINE_REQUISE");
  }

  if (!approvedById.trim() || ["auto", "system"].includes(approvedById.trim())) {
    throw new Error("IDENTITE_HUMAINE_NON_VALIDE");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await database.$transaction(
        async (tx) => {
          const workspace = await tx.workspace.findFirst({
            where: { id: input.workspaceId, ownerId: approvedById },
            select: { id: true },
          });
          if (!workspace) {
            throw new Error("PROPRIETAIRE_NON_AUTORISE");
          }

          const model = await tx.evolutionModelRecord.findFirst({
            where: { id: input.modelRecordId, workspaceId: input.workspaceId },
          });
          if (!model || model.status !== "EVALUATED") {
            throw new Error("MODELE_NON_ADMISSIBLE");
          }
          const evaluation = await tx.evolutionEvaluationRecord.findFirst({
            where: { id: input.evaluationId, modelRecordId: model.id },
          });
          if (!evaluation || !evaluation.compatible || !evaluation.capabilitiesVerified) {
            throw new Error("EVALUATION_NON_ADMISSIBLE");
          }
          const updated = await tx.evolutionModelRecord.updateMany({
            where: {
              id: model.id,
              workspaceId: input.workspaceId,
              status: "EVALUATED",
            },
            data: { status: "APPROVED", approvedAt: new Date() },
          });
          if (updated.count !== 1) {
            throw new Error("APPROBATION_DEJA_TRAITEE");
          }
          const approval = await tx.evolutionApprovalRecord.create({
            data: {
              modelRecordId: model.id,
              evaluationId: evaluation.id,
              approved: true,
              approvedById,
              reason: "Approbation humaine explicite du propriétaire.",
            },
          });
          return {
            approvalId: approval.id,
            modelRecordId: model.id,
            status: "APPROVED" as const,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (isTransactionConflict(error) && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("TRANSACTION_NON_EXECUTEE");
}
