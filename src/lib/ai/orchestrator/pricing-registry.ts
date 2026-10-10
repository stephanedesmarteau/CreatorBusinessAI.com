import type {
  AIModelPricing,
} from "./cost-estimator";

export type VerifiedModelPricing = {
  modelId: string;
  pricing: AIModelPricing;
  source: string;
  verifiedAt: string;
};

const VERIFIED_PRICING: Record<
  string,
  VerifiedModelPricing
> = {};

export function getVerifiedModelPricing(
  modelId: string
): VerifiedModelPricing | null {
  return VERIFIED_PRICING[modelId] ?? null;
}
