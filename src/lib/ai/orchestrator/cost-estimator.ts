import type {
  AIUsageMetrics,
} from "./usage-metrics";

export type AIModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

export type AICostEstimate = {
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
};

export function estimateAICost(
  usage: AIUsageMetrics,
  pricing: AIModelPricing
): AICostEstimate {
  const inputCostUSD =
    (usage.inputTokens / 1_000_000) *
    pricing.inputPerMillion;

  const outputCostUSD =
    (usage.outputTokens / 1_000_000) *
    pricing.outputPerMillion;

  return {
    inputCostUSD,
    outputCostUSD,
    totalCostUSD:
      inputCostUSD + outputCostUSD,
  };
}
