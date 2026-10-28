import type { DiscoveredModelCandidate } from "./model-discovery";
import {
  prepareDiscoveryRecord,
} from "./model-discovery-persistence-core";
import {
  authorizeModelApprovalCore,
  type AuthorizationDependencies,
} from "./model-authorization-core";

export type DiscoveryPersistenceDependencies =
  AuthorizationDependencies & {
    createIfAbsent: (
      record: ReturnType<typeof prepareDiscoveryRecord>
    ) => Promise<{ id: string; created: boolean }>;
  };

export async function persistDiscoveredModel(
  workspaceId: string,
  candidate: DiscoveredModelCandidate,
  dependencies: DiscoveryPersistenceDependencies
) {
  const record = prepareDiscoveryRecord({
    workspaceId,
    candidate,
  });

  const authorization = await authorizeModelApprovalCore(
    record.workspaceId,
    dependencies
  );

  if (!authorization.authorized) {
    throw new Error(authorization.reason);
  }

  return dependencies.createIfAbsent(record);
}
