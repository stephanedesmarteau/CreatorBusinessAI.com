import type { DiscoveredModelCandidate } from "./model-discovery";
import {
  persistDiscoveredModel,
  type DiscoveryPersistenceDependencies,
} from "./model-discovery-persistence-service";

import { authorizeModelApprovalCore } from "./model-authorization-core";

import { InvalidDiscoveredModelError } from "./model-discovery-validation-error";

export type DiscoveryBatchResult = {
  discovered: number;
  skipped: number;
  rejected: number;
};

export async function persistDiscoveredModelsBatch(
  workspaceId: string,
  candidates: DiscoveredModelCandidate[],
  dependencies: DiscoveryPersistenceDependencies
): Promise<DiscoveryBatchResult> {
  const authorization = await authorizeModelApprovalCore(
    workspaceId,
    dependencies
  );

  if (!authorization.authorized) {
    throw new Error(authorization.reason);
  }

  const result: DiscoveryBatchResult = {
    discovered: 0,
    skipped: 0,
    rejected: 0,
  };

  for (const candidate of candidates) {
    try {
      const saved = await persistDiscoveredModel(
        workspaceId,
        candidate,
        dependencies
      );

      if (saved.created) {
        result.discovered++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      if (error instanceof InvalidDiscoveredModelError) {
        result.rejected++;
        continue;
      }

      throw error;
    }
  }

  return result;
}
