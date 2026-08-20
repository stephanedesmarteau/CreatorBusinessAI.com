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

    return NextResponse.json({
      success: true,
      route,
      message,
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
