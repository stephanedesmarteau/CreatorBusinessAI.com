import type { DiscoveredModelCandidate } from "./model-discovery";

export type DiscoveryPersistenceInput = {
  workspaceId: string;
  candidate: DiscoveredModelCandidate;
};

export function prepareDiscoveryRecord(
  input: DiscoveryPersistenceInput
) {
  const workspaceId = input.workspaceId.trim();
  const candidate = input.candidate;

  const provider = candidate.provider.trim();
  const modelId = candidate.id.trim();
  const name = candidate.name.trim();
  const source = candidate.source.trim();

  if (!workspaceId) {
    throw new Error("Workspace requis.");
  }

  if (!provider || !modelId || !name || !source) {
    throw new Error("Modèle découvert invalide.");
  }

  if (
    !Array.isArray(candidate.capabilities) ||
    candidate.capabilities.length === 0
  ) {
    throw new Error("Capacités du modèle requises.");
  }

  if (
    !["fast", "balanced", "powerful", "specialized"].includes(
      candidate.tier
    )
  ) {
    throw new Error("Catégorie de modèle invalide.");
  }

  return {
    workspaceId,
    provider,
    modelId,
    name,
    tier: candidate.tier,
    capabilities: [...candidate.capabilities],
    status: "DISCOVERED" as const,
  };
}
