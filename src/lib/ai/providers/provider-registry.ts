export type AIProviderId =
  | "openai";

export type AICapability =
  | "text"
  | "reasoning"
  | "planning"
  | "coding"
  | "business"
  | "research"
  | "marketing"
  | "memory"
  | "image-generation"
  | "image-edit"
  | "video-generation"
  | "speech-generation"
  | "transcription";

export type AIModelTier =
  | "fast"
  | "balanced"
  | "powerful"
  | "specialized";

export type AIProviderDefinition = {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  apiKeyEnv: string;
};

export type AIRegistryModel = {
  key: string;
  id: string;
  provider: AIProviderId;
  tier: AIModelTier;
  capabilities: AICapability[];
  enabled: boolean;
};

export const AI_PROVIDER_REGISTRY = {
  openai: {
    id: "openai",
    name: "OpenAI",
    enabled: true,
    apiKeyEnv: "OPENAI_API_KEY",
  },
} satisfies Record<
  AIProviderId,
  AIProviderDefinition
>;

export const AI_PROVIDER_MODELS = {
  fast: {
    key: "fast",
    id:
      process.env.OPENAI_FAST_MODEL ||
      "gpt-5.6-luna",
    provider: "openai",
    tier: "fast",
    capabilities: [
      "text",
      "planning",
      "memory",
    ],
    enabled: true,
  },

  balanced: {
    key: "balanced",
    id:
      process.env.OPENAI_BALANCED_MODEL ||
      "gpt-5.6-terra",
    provider: "openai",
    tier: "balanced",
    capabilities: [
      "text",
      "reasoning",
      "marketing",
    ],
    enabled: true,
  },

  powerful: {
    key: "powerful",
    id:
      process.env.OPENAI_POWERFUL_MODEL ||
      "gpt-5.6-sol",
    provider: "openai",
    tier: "powerful",
    capabilities: [
      "text",
      "reasoning",
      "planning",
      "coding",
      "business",
      "research",
    ],
    enabled: true,
  },

  businessDefault: {
    key: "business-default",
    id:
      process.env.OPENAI_BUSINESS_MODEL ||
      "gpt-5.6",
    provider: "openai",
    tier: "balanced",
    capabilities: [
      "text",
      "reasoning",
      "business",
    ],
    enabled: true,
  },

  image: {
    key: "image",
    id:
      process.env.OPENAI_IMAGE_MODEL ||
      "gpt-image-2",
    provider: "openai",
    tier: "specialized",
    capabilities: [
      "image-generation",
      "image-edit",
    ],
    enabled: true,
  },

  video: {
    key: "video",
    id:
      process.env.OPENAI_VIDEO_MODEL ||
      "sora-2",
    provider: "openai",
    tier: "specialized",
    capabilities: [
      "video-generation",
    ],
    enabled: true,
  },

  videoPro: {
    key: "video-pro",
    id:
      process.env.OPENAI_VIDEO_PRO_MODEL ||
      "sora-2-pro",
    provider: "openai",
    tier: "specialized",
    capabilities: [
      "video-generation",
    ],
    enabled: true,
  },

  voice: {
    key: "voice",
    id:
      process.env.OPENAI_VOICE_MODEL ||
      "gpt-4o-mini-tts-2025-12-15",
    provider: "openai",
    tier: "specialized",
    capabilities: [
      "speech-generation",
    ],
    enabled: true,
  },

  transcription: {
    key: "transcription",
    id:
      process.env.OPENAI_TRANSCRIBE_MODEL ||
      "gpt-4o-transcribe",
    provider: "openai",
    tier: "specialized",
    capabilities: [
      "transcription",
    ],
    enabled: true,
  },
} satisfies Record<
  string,
  AIRegistryModel
>;

export function getAIProvider(
  providerId: AIProviderId
): AIProviderDefinition {
  return AI_PROVIDER_REGISTRY[
    providerId
  ];
}

export function isAIProviderAvailable(
  providerId: AIProviderId
): boolean {
  const provider =
    getAIProvider(providerId);

  return Boolean(
    provider.enabled &&
    process.env[
      provider.apiKeyEnv
    ]
  );
}

export function getAIModel(
  key: keyof typeof AI_PROVIDER_MODELS
): AIRegistryModel {
  return AI_PROVIDER_MODELS[key];
}

export function getModelsForCapability(
  capability: AICapability
): AIRegistryModel[] {
  return Object.values(
    AI_PROVIDER_MODELS
  ).filter((model) => {
    const capabilities:
      readonly AICapability[] =
        model.capabilities;

    return (
      model.enabled &&
      capabilities.includes(
        capability
      )
    );
  });
}

export function getAvailableModelsForCapability(
  capability: AICapability
): AIRegistryModel[] {
  return getModelsForCapability(
    capability
  ).filter(
    (model) =>
      isAIProviderAvailable(
        model.provider
      )
  );
}

export function describeAIRegistry() {
  return {
    providers:
      Object.values(
        AI_PROVIDER_REGISTRY
      ).map((provider) => ({
        id: provider.id,
        name: provider.name,
        enabled:
          provider.enabled,
        available:
          isAIProviderAvailable(
            provider.id
          ),
      })),

    models:
      Object.values(
        AI_PROVIDER_MODELS
      ).map((model) => ({
        key: model.key,
        id: model.id,
        provider:
          model.provider,
        tier: model.tier,
        capabilities:
          model.capabilities,
        enabled:
          model.enabled,
        providerAvailable:
          isAIProviderAvailable(
            model.provider
          ),
      })),
  };
}
