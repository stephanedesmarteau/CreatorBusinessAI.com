import type { AICapability } from "../providers/provider-registry";

export const ALLOWED_CAPABILITIES = new Set<string>([
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

export function hasValidModelCapabilities(
  capabilities: unknown
): capabilities is AICapability[] {
  return (
    Array.isArray(capabilities) &&
    capabilities.length > 0 &&
    capabilities.every(
      (capability) =>
        typeof capability === "string" &&
        ALLOWED_CAPABILITIES.has(capability)
    )
  );
}
