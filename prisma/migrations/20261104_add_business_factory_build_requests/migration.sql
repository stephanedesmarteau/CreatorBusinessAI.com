-- CreateTable
CREATE TABLE "BusinessFactoryBuildRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "sourceProjectId" TEXT,
    "generatedProjectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFactoryBuildRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessFactoryBuildRequest_workspaceId_status_idx" ON "BusinessFactoryBuildRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "BusinessFactoryBuildRequest_sourceProjectId_idx" ON "BusinessFactoryBuildRequest"("sourceProjectId");

-- CreateIndex
CREATE INDEX "BusinessFactoryBuildRequest_generatedProjectId_idx" ON "BusinessFactoryBuildRequest"("generatedProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessFactoryBuildRequest_workspaceId_idempotencyKey_key" ON "BusinessFactoryBuildRequest"("workspaceId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "BusinessFactoryBuildRequest" ADD CONSTRAINT "BusinessFactoryBuildRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
