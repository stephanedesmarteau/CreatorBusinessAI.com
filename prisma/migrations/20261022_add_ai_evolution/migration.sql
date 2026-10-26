-- CreateTable
CREATE TABLE "EvolutionModelRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "capabilities" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvolutionModelRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionEvaluationRecord" (
    "id" TEXT NOT NULL,
    "modelRecordId" TEXT NOT NULL,
    "compatible" BOOLEAN NOT NULL,
    "capabilitiesVerified" BOOLEAN NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION,
    "latencyMs" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "notes" TEXT[],
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolutionEvaluationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionApprovalRecord" (
    "id" TEXT NOT NULL,
    "modelRecordId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "approvedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolutionApprovalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvolutionModelRecord_workspaceId_status_idx" ON "EvolutionModelRecord"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EvolutionModelRecord_workspaceId_provider_modelId_key" ON "EvolutionModelRecord"("workspaceId", "provider", "modelId");

-- CreateIndex
CREATE INDEX "EvolutionEvaluationRecord_modelRecordId_evaluatedAt_idx" ON "EvolutionEvaluationRecord"("modelRecordId", "evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvolutionEvaluationRecord_id_modelRecordId_key" ON "EvolutionEvaluationRecord"("id", "modelRecordId");

-- CreateIndex
CREATE INDEX "EvolutionApprovalRecord_modelRecordId_decidedAt_idx" ON "EvolutionApprovalRecord"("modelRecordId", "decidedAt");

-- CreateIndex
CREATE INDEX "EvolutionApprovalRecord_evaluationId_idx" ON "EvolutionApprovalRecord"("evaluationId");

-- CreateIndex
CREATE INDEX "EvolutionApprovalRecord_approvedById_idx" ON "EvolutionApprovalRecord"("approvedById");

-- AddForeignKey
ALTER TABLE "EvolutionModelRecord" ADD CONSTRAINT "EvolutionModelRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionEvaluationRecord" ADD CONSTRAINT "EvolutionEvaluationRecord_modelRecordId_fkey" FOREIGN KEY ("modelRecordId") REFERENCES "EvolutionModelRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionApprovalRecord" ADD CONSTRAINT "EvolutionApprovalRecord_modelRecordId_fkey" FOREIGN KEY ("modelRecordId") REFERENCES "EvolutionModelRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionApprovalRecord" ADD CONSTRAINT "EvolutionApprovalRecord_evaluationId_modelRecordId_fkey" FOREIGN KEY ("evaluationId", "modelRecordId") REFERENCES "EvolutionEvaluationRecord"("id", "modelRecordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionApprovalRecord" ADD CONSTRAINT "EvolutionApprovalRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
