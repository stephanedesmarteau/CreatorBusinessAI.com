import type {
  AICapability,
  AIModelTier,
} from "../providers/provider-registry";

export type EvolutionModelStatus =
  | "DISCOVERED"
  | "EVALUATED"
  | "APPROVED"
  | "ACTIVE"
  | "REJECTED"
  | "DISABLED";

export type EvolutionProviderId = string;

export type EvolutionModel = {
  id: string;
  provider: EvolutionProviderId;
  name: string;
  tier: AIModelTier;
  capabilities: AICapability[];
  status: EvolutionModelStatus;
  discoveredAt: string;
  evaluatedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
};

export type EvolutionEvaluation = {
  modelId: string;
  compatible: boolean;
  capabilitiesVerified: boolean;
  estimatedCostUsd?: number;
  latencyMs?: number;
  qualityScore?: number;
  evaluatedAt: string;
  notes: string[];
};

export type EvolutionDecision = {
  modelId: string;
  approved: boolean;
  approvedBy: string;
  decidedAt: string;
  reason: string;
};
