export type AIUsageMetrics = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function extractUsageMetrics(
  response: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    } | null;
  }
): AIUsageMetrics | null {
  const usage = response.usage;

  if (!usage) {
    return null;
  }

  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens:
      usage.total_tokens ??
      inputTokens + outputTokens,
  };
}
