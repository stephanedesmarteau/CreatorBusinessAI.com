import {
  estimateAICost,
  type AICostEstimate,
} from "./cost-estimator";

import {
  getVerifiedModelPricing,
} from "./pricing-registry";

import type {
  AIUsageMetrics,
} from "./usage-metrics";

export type ModelCostResult =
  | {
      status: "available";
      modelId: string;
      estimate: AICostEstimate;
      currency: "USD";
      source: string;
      verifiedAt: string;
    }
  | {
      status: "unavailable";
      modelId: string;
      reason: "missing_usage" | "missing_pricing";
    };

export function calculateModelCost(
  modelId: string,
  usage: AIUsageMetrics | null
): ModelCostResult {
  if (!usage) {
    return {
      status: "unavailable",
      modelId,
      reason: "missing_usage",
    };
  }

  const verified =
    getVerifiedModelPricing(modelId);

  if (!verified) {
    return {
      status: "unavailable",
      modelId,
      reason: "missing_pricing",
    };
  }

  return {
    status: "available",
    modelId,
    estimate: estimateAICost(
      usage,
      verified.pricing
    ),
    currency: "USD",
    source: verified.source,
    verifiedAt: verified.verifiedAt,
  };
}
