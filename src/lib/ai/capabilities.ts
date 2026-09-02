import type { AIRoute } from "./agents";

export type AICapability = {
  route: AIRoute;
  name: string;
  description: string;
  enabled: boolean;
  mode: "text" | "media";
};

export const aiCapabilities: AICapability[] = [
  {
    route: "business",
    name: "Business Engine (O3, Perplexity, GPT-4o)",
    description: "Création de compagnies, étude de marché mondiale, modèle financier et plans d'affaires",
    enabled: true,
    mode: "text",
  },
  {
    route: "code",
    name: "Code Engine (Claude 3.7, DeepSeek R1, GPT-4o)",
    description: "Tous exemples de sites web, applications mobiles iOS/Android, logiciels, API et programmation",
    enabled: true,
    mode: "text",
  },
  {
    route: "research",
    name: "Research Engine (Perplexity, Gemini 2.0 Pro, DeepSeek)",
    description: "Recherche en temps réel et analyse comparative sur plus de 50 moteurs",
    enabled: true,
    mode: "text",
  },
  {
    route: "marketing",
    name: "Marketing Engine (GPT-4o, Llama 3.3, Mistral)",
    description: "SEO, publicité, tunnels de vente, conversion et acquisition client",
    enabled: true,
    mode: "text",
  },
  {
    route: "general",
    name: "Méta-Moteur 50+ IA NaturalCreatorAI",
    description: "Méta-orchestrateur universel interrogeant les 50 meilleurs modèles au monde pour répondre à tout",
    enabled: true,
    mode: "text",
  },
  {
    route: "image",
    name: "Image Engine (Midjourney, Flux1, DALL-E 3)",
    description: "Génération et modification d'images haute définition, maquettes et identités visuelles",
    enabled: true,
    mode: "media",
  },
  {
    route: "video",
    name: "Video Engine (Sora-2, Runway Gen-3, Luma)",
    description: "Production de vidéos cinématiques, démos animées et contenus publicitaires",
    enabled: true,
    mode: "media",
  },
  {
    route: "voice",
    name: "Voice Engine (ElevenLabs, Whisper, Voice AI)",
    description: "Voix-off ultra-réalistes, doublage multilingue, audio et transcription instantanée",
    enabled: true,
    mode: "media",
  },
];

export function getCapability(route: AIRoute) {
  return aiCapabilities.find((capability) => capability.route === route);
}
