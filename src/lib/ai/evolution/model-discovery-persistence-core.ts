import { InvalidDiscoveredModelError } from "./model-discovery-validation-error";
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

  if (
    !candidate ||
    typeof candidate.provider !== "string" ||
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.source !== "string"
  ) {
    throw new InvalidDiscoveredModelError(
      "Modèle découvert invalide."
    );
  }

  const provider = candidate.provider.trim();
  const modelId = candidate.id.trim();
  const name = candidate.name.trim();
  const source = candidate.source.trim();

  if (!workspaceId) {
    throw new Error("Workspace requis.");
  }

  if (!provider || !modelId || !name || !source) {
    throw new InvalidDiscoveredModelError("Modèle découvert invalide.");
  }

  if (
    !Array.isArray(candidate.capabilities) ||
    candidate.capabilities.length === 0
  ) {
    throw new InvalidDiscoveredModelError("Capacités du modèle requises.");
  }

  const allowedCapabilities = new Set([
    "text",
    "reasoning",
    "planning",
    "coding",
    "business",
    "research",
    "marketing",
    "memory",
    "image-generation",
    "image-edit",
    "video-generation",
    "speech-generation",
    "transcription",
  ]);

  if (
    candidate.capabilities.some(
      (capability) =>
        typeof capability !== "string" ||
        !allowedCapabilities.has(capability)
    )
  ) {
    throw new InvalidDiscoveredModelError(
      "Capacités du modèle invalides."
    );
  }

  if (
    !["fast", "balanced", "powerful", "specialized"].includes(
      candidate.tier
    )
  ) {
    throw new InvalidDiscoveredModelError("Catégorie de modèle invalide.");
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
