import OpenAI from "openai";
import {
  extractUsageMetrics,
  type AIUsageMetrics,
} from "./usage-metrics";

import {
  calculateModelCost,
  type ModelCostResult,
} from "./model-cost";

import {
  AI_MODEL_REGISTRY,
  getFallbackModel,
  getModelForRole,
  type AIModelDefinition,
  type AIModelRole,
  type AIModelTier,
} from "./model-registry";

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 60000,
  });
}

type OpenAIClient =
  ReturnType<typeof createOpenAIClient>;

export type AIComplexity =
  | "low"
  | "medium"
  | "high";

export type ModelExecutionTrace = {
  role: AIModelRole;
  complexity: AIComplexity;
  requestedTier: AIModelTier;
  selectedModel: string;
  selectedTier: AIModelTier;
  fallbackUsed: boolean;
  usage?: AIUsageMetrics | null;
  cost?: ModelCostResult;
  attempts: Array<{
    model: string;
    tier: AIModelTier;
    success: boolean;
    error?: string;
  }>;
};

type NonStreamingResponse =
  Awaited<
    ReturnType<OpenAIClient["responses"]["create"]>
  > extends infer Result
    ? Result extends { output_text: string }
      ? Result
      : never
    : never;

export type RoutedModelResponse = {
  response: NonStreamingResponse;
  trace: ModelExecutionTrace;
};

function upgradeModel(
  model: AIModelDefinition
): AIModelDefinition {
  if (model.tier === "fast") {
    return AI_MODEL_REGISTRY.balanced;
  }

  if (model.tier === "balanced") {
    return AI_MODEL_REGISTRY.powerful;
  }

  return model;
}

function selectPrimaryModel(
  role: AIModelRole,
  complexity: AIComplexity
): AIModelDefinition {
  const base =
    getModelForRole(role);

  if (complexity === "high") {
    if (base.tier === "powerful") {
      return base;
    }

    return upgradeModel(base);
  }

  if (
    complexity === "medium" &&
    base.tier === "fast"
  ) {
    return AI_MODEL_REGISTRY.balanced;
  }

  return base;
}

function buildModelChain(
  primary: AIModelDefinition
): AIModelDefinition[] {
  const chain: AIModelDefinition[] = [];
  const seen = new Set<string>();

  let current:
    | AIModelDefinition
    | null = primary;

  while (current) {
    if (seen.has(current.id)) {
      break;
    }

    seen.add(current.id);

    if (current.enabled) {
      chain.push(current);
    }

    current =
      getFallbackModel(current);
  }

  return chain;
}

function errorMessage(
  error: unknown
) {
  return error instanceof Error
    ? error.message
    : "Erreur IA inconnue.";
}

function shouldStopFallback(error: unknown): boolean {
  const e = error as {
    status?: number;
    code?: string;
    error?: { code?: string };
  } | null;

  if ([400, 401, 403, 404, 422].includes(e?.status ?? 0)) {
    return true;
  }

  const code = e?.code ?? e?.error?.code;

  return [
    "insufficient_quota",
    "billing_hard_limit_reached",
  ].includes(code ?? "");
}

export async function runRoutedResponse(
  role: AIModelRole,
  complexity: AIComplexity,
  request: Omit<
    Parameters<
      OpenAIClient["responses"]["create"]
    >[0],
    "model"
  >
): Promise<RoutedModelResponse> {
  const client = createOpenAIClient();

  const primary =
    selectPrimaryModel(
      role,
      complexity
    );

  const chain =
    buildModelChain(primary);

  if (chain.length === 0) {
    throw new Error(
      `Aucun modèle actif pour le rôle ${role}.`
    );
  }

  const attempts:
    ModelExecutionTrace["attempts"] = [];

  let lastError: unknown = null;

  for (const model of chain.slice(0, 2)) {
    try {
      const response =
        await client.responses.create({
          ...request,
          model: model.id,
          stream: false,
        });

      attempts.push({
        model: model.id,
        tier: model.tier,
        success: true,
      });

      const trace: ModelExecutionTrace = {
        role,
        complexity,
        requestedTier:
          primary.tier,
        selectedModel:
          model.id,
        selectedTier:
          model.tier,
        fallbackUsed:
          model.id !== primary.id,
        usage: extractUsageMetrics(response),
        cost: calculateModelCost(
          model.id,
          extractUsageMetrics(response)
        ),
        attempts,
      };

      console.info(
        "[AI Model Router]",
        JSON.stringify(trace)
      );

      return {
        response:
          response as NonStreamingResponse,
        trace,
      };
    } catch (error) {
      lastError = error;

      attempts.push({
        model: model.id,
        tier: model.tier,
        success: false,
        error:
          errorMessage(error),
      });

      console.warn(
        `[AI Model Router] Échec ${model.id}.`,
        error
      );

      if (shouldStopFallback(error)) {
        throw error;
      }
    }
  }

  console.error(
    "[AI Model Router] Tous les modèles ont échoué.",
    JSON.stringify({
      role,
      complexity,
      attempts,
    })
  );

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Tous les modèles IA disponibles ont échoué."
      );
}
