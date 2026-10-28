import type { DiscoveredModelCandidate } from "./model-discovery";
import {
  persistDiscoveredModel,
  type DiscoveryPersistenceDependencies,
} from "./model-discovery-persistence-service";

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
  const result: DiscoveryBatchResult = {
    discovered: 0,
    skipped: 0,
    rejected: 0,
  };

  for (const candidate of candidates) {
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
  }

  return result;
}
