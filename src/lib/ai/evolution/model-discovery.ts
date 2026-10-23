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
