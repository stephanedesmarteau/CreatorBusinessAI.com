import type { OrchestratorAgent } from "./types";
import {
  getAIModel,
  type AIProviderId,
} from "@/lib/ai/providers";

export type AIModelRole =
  | "planner"
  | "business"
  | "code"
  | "research"
  | "marketing"
  | "general"
  | "synthesizer";

export type AIModelTier =
  | "fast"
  | "balanced"
  | "powerful";

export type AIModelDefinition = {
  id: string;
  provider: AIProviderId;
  tier: AIModelTier;
  capabilities: string[];
  enabled: boolean;
};

export const AI_MODEL_REGISTRY = {
  fast: {
    id: getAIModel("fast").id,
    provider: "openai",
    tier: "fast",
    capabilities: [
      "planning",
      "classification",
      "routing",
      "memory",
    ],
    enabled: true,
  },

  balanced: {
    id: getAIModel("balanced").id,
    provider: "openai",
    tier: "balanced",
    capabilities: [
      "general",
      "marketing",
      "synthesis",
      "analysis",
    ],
    enabled: true,
  },

  powerful: {
    id: getAIModel("powerful").id,
    provider: "openai",
    tier: "powerful",
    capabilities: [
      "business",
      "code",
      "research",
      "complex-analysis",
    ],
    enabled: true,
  },
} satisfies Record<
  AIModelTier,
  AIModelDefinition
>;

export function getModelForRole(
  role: AIModelRole
): AIModelDefinition {
  switch (role) {
    case "planner":
      return AI_MODEL_REGISTRY.fast;

    case "business":
    case "code":
    case "research":
      return AI_MODEL_REGISTRY.powerful;

    case "marketing":
    case "general":
    case "synthesizer":
    default:
      return AI_MODEL_REGISTRY.balanced;
  }
}

export function getModelForAgent(
  agent: OrchestratorAgent
): AIModelDefinition {
  return getModelForRole(agent);
}

export function getFallbackModel(
  model: AIModelDefinition
): AIModelDefinition | null {
  if (model.tier === "powerful") {
    return AI_MODEL_REGISTRY.balanced;
  }

  if (model.tier === "balanced") {
    return AI_MODEL_REGISTRY.fast;
  }

  if (model.tier === "fast") {
    return AI_MODEL_REGISTRY.balanced;
  }

  return null;
}
