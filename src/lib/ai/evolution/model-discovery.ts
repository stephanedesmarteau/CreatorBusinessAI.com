import type {
  AICapability,
  AIModelTier,
} from "../providers/provider-registry";

import { EvolutionModelCatalog } from "./model-catalog";
import type { EvolutionModel } from "./types";

export type DiscoveredModelCandidate = {
  id: string;
  provider: string;
  name: string;
  tier: AIModelTier;
  capabilities: AICapability[];
  source: string;
};

export type DiscoveryResult = {
  discovered: number;
  skipped: number;
  rejected: number;
};

const ALLOWED_CAPABILITIES = new Set<string>([
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

export function discoverModels(
  catalog: EvolutionModelCatalog,
  candidates: DiscoveredModelCandidate[]
): DiscoveryResult {
  const result: DiscoveryResult = {
    discovered: 0,
    skipped: 0,
    rejected: 0,
  };

  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate.id !== "string" ||
      typeof candidate.provider !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.source !== "string"
    ) {
      result.rejected++;
      continue;
    }

    const id = candidate.id.trim();
    const provider = candidate.provider.trim();
    const name = candidate.name.trim();
    const source = candidate.source.trim();

    if (
      !id ||
      !provider ||
      !name ||
      !source ||
      !Array.isArray(candidate.capabilities) ||
      candidate.capabilities.length === 0 ||
      !candidate.capabilities.every(
        (capability) =>
          typeof capability === "string" &&
          ALLOWED_CAPABILITIES.has(capability)
      ) ||
      !["fast", "balanced", "powerful", "specialized"]
        .includes(candidate.tier)
    ) {
      result.rejected++;
      continue;
    }

    const model: EvolutionModel = {
      id,
      provider,
      name,
      tier: candidate.tier,
      capabilities: [...candidate.capabilities],
      status: "DISCOVERED",
      discoveredAt: new Date().toISOString(),
    };

    if (catalog.register(model)) {
      result.discovered++;
    } else {
      result.skipped++;
    }
  }

  return result;
}
