-- CreateTable
CREATE TABLE "ProjectAnalysis" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "localId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "targetMarket" TEXT NOT NULL,
    "mainGoal" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAnalysis_workspaceId_idx" ON "ProjectAnalysis"("workspaceId");

-- CreateIndex
CREATE INDEX "ProjectAnalysis_projectId_idx" ON "ProjectAnalysis"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAnalysis_updatedAt_idx" ON "ProjectAnalysis"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAnalysis_workspaceId_localId_key" ON "ProjectAnalysis"("workspaceId", "localId");

-- AddForeignKey
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
