import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const allowedRoutes = [
  "business",
  "code",
  "research",
  "image",
  "video",
  "voice",
  "marketing",
  "general",
] as const;

type AIRoute = (typeof allowedRoutes)[number];

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const message = String(body.message ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Veuillez fournir une demande." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5.6",
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "developer",
          content: `
Tu es le routeur central de CreatorBusinessAI.

Analyse la demande de l'utilisateur et choisis UNE SEULE catégorie :

business
code
research
image
video
voice
marketing
general

Règles :
- business : création, analyse ou développement d'entreprise
- code : programmation, sites, applications, logiciels
- research : recherche, comparaison, collecte ou analyse d'informations
- image : création ou modification d'images
- video : création ou production vidéo
- voice : voix, audio, transcription ou doublage
- marketing : publicité, SEO, contenu, réseaux sociaux, acquisition
- general : tout ce qui ne correspond pas clairement aux catégories précédentes

Réponds uniquement avec le nom exact de la catégorie.
          `.trim(),
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const rawRoute = response.output_text.trim().toLowerCase();

    const route: AIRoute = allowedRoutes.includes(rawRoute as AIRoute)
      ? (rawRoute as AIRoute)
      : "general";

    const agentInstructions: Partial<Record<AIRoute, string>> = {
      business: `
Tu es l'agent Business de CreatorBusinessAI.
Aide l'utilisateur à créer, analyser, améliorer ou développer une entreprise.
Sois stratégique, concret, réaliste et orienté vers l'exécution.
Réponds en français sauf demande contraire.
      `.trim(),

      code: `
Tu es l'agent Code de CreatorBusinessAI.
Aide l'utilisateur à concevoir et développer des sites web, applications,
logiciels, API et systèmes techniques.
Donne des solutions concrètes, structurées et directement exploitables.
Lorsque du code est nécessaire, fournis du code propre et explique où l'utiliser.
Réponds en français sauf demande contraire.
      `.trim(),

      research: `
Tu es l'agent Recherche de CreatorBusinessAI.
Analyse la demande, structure la recherche, identifie les informations importantes
et produis une synthèse claire.
Si des informations en temps réel ou des sources externes sont nécessaires,
indique clairement qu'une connexion à un moteur de recherche sera nécessaire.
Ne prétends pas avoir consulté Internet si ce n'est pas le cas.
Réponds en français sauf demande contraire.
      `.trim(),

      marketing: `
Tu es l'agent Marketing de CreatorBusinessAI.
Aide avec le marketing, le SEO, la publicité, le contenu,
les réseaux sociaux, l'acquisition et la conversion.
Donne des recommandations concrètes, mesurables et adaptées au projet.
Réponds en français sauf demande contraire.
      `.trim(),

      general: `
Tu es l'assistant général de CreatorBusinessAI.
Réponds de manière utile, claire, professionnelle et orientée vers l'action.
Réponds en français sauf demande contraire.
      `.trim(),
    };

    if (route === "image" || route === "video" || route === "voice") {
      return NextResponse.json({
        success: true,
        route,
        message,
        result:
          "La demande a été correctement identifiée. Le moteur spécialisé " +
          route +
          " sera connecté dans une prochaine étape de CreatorBusinessAI.",
      });
    }

    const agentResponse = await client.responses.create({
      model: "gpt-5.6",
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "developer",
          content:
            agentInstructions[route] ||
            agentInstructions.general ||
            "Réponds utilement à la demande.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      route,
      message,
      result: agentResponse.output_text,
    });
  } catch (error) {
    console.error("Erreur AI Router:", error);

    return NextResponse.json(
      {
        error: "Une erreur est survenue dans le AI Router.",
      },
      { status: 500 }
    );
  }
}
