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
    name: "Business Agent",
    description: "Création, analyse et développement d'entreprises",
    enabled: true,
    mode: "text",
  },
  {
    route: "code",
    name: "Code Agent",
    description: "Sites web, applications, logiciels, API et programmation",
    enabled: true,
    mode: "text",
  },
  {
    route: "research",
    name: "Research Agent",
    description: "Recherche, comparaison et analyse d'informations",
    enabled: true,
    mode: "text",
  },
  {
    route: "marketing",
    name: "Marketing Agent",
    description: "SEO, publicité, contenu, acquisition et conversion",
    enabled: true,
    mode: "text",
  },
  {
    route: "general",
    name: "General Agent",
    description: "Assistant général CreatorBusinessAI",
    enabled: true,
    mode: "text",
  },
  {
    route: "image",
    name: "Image Engine",
    description: "Création et modification d'images",
    enabled: false,
    mode: "media",
  },
  {
    route: "video",
    name: "Video Engine",
    description: "Création et production vidéo",
    enabled: false,
    mode: "media",
  },
  {
    route: "voice",
    name: "Voice Engine",
    description: "Voix, audio, transcription et doublage",
    enabled: false,
    mode: "media",
  },
];

export function getCapability(route: AIRoute) {
  return aiCapabilities.find((capability) => capability.route === route);
}
