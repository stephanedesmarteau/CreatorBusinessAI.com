-- CreateTable
CREATE TABLE "BuilderAiOperation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderAiOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuilderAiOperation_workspaceId_idx" ON "BuilderAiOperation"("workspaceId");

-- CreateIndex
CREATE INDEX "BuilderAiOperation_projectId_operationType_idx" ON "BuilderAiOperation"("projectId", "operationType");

-- CreateIndex
CREATE INDEX "BuilderAiOperation_projectId_status_idx" ON "BuilderAiOperation"("projectId", "status");

-- AddForeignKey
ALTER TABLE "BuilderAiOperation" ADD CONSTRAINT "BuilderAiOperation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderAiOperation" ADD CONSTRAINT "BuilderAiOperation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
