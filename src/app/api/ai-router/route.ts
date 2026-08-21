import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  agentInstructions,
  type AIRoute,
} from "@/lib/ai/agents";
import { getCapability } from "@/lib/ai/capabilities";
import { generateImage } from "@/lib/ai/image-engine";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const allowedRoutes: AIRoute[] = [
  "business",
  "code",
  "research",
  "image",
  "video",
  "voice",
  "marketing",
  "general",
];

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
    const imageSize = String(body.imageSize ?? "1024x1024");
    const imageQuality = String(body.imageQuality ?? "medium");

    if (!message) {
      return NextResponse.json(
        { error: "Veuillez fournir une demande." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
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
- business : création, planification ou développement concret d'une entreprise, business plan, modèle économique ou stratégie d'entreprise
- code : programmation, développement de sites web, applications, logiciels ou génération de code
- research : PRIORITAIRE lorsque la demande consiste à rechercher, comparer, étudier, collecter ou analyser des informations, marchés, tendances, entreprises, produits ou stratégies
- image : création ou modification d'images
- video : création ou production vidéo
- voice : voix, audio, transcription ou doublage
- marketing : publicité, SEO, contenu, réseaux sociaux, acquisition
- general : tout ce qui ne correspond pas clairement aux catégories précédentes

Priorité de routage :
- Si l'utilisateur demande principalement une comparaison, une recherche, une étude ou une analyse de plusieurs options, choisir research, même si le sujet concerne une entreprise.
- Si l'utilisateur veut créer ou développer concrètement son entreprise, choisir business.
- Si l'utilisateur demande de créer/programmer un site, une application ou du code, choisir code.
- Si l'utilisateur demande de créer ou modifier une image, choisir image.

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

    const capability = getCapability(route);

    if (!capability || !capability.enabled) {
      return NextResponse.json({
        success: true,
        route,
        message,
        capability: capability || null,
        result:
          "La demande a été correctement identifiée, mais cette capacité " +
          "n'est pas encore activée dans CreatorBusinessAI.",
      });
    }

    if (route === "image") {
      const image = await generateImage(
        message,
        imageSize,
        imageQuality
      );

      return NextResponse.json({
        success: true,
        route,
        message,
        capability,
        image,
      });
    }

    const useSol = ["business", "code", "research"].includes(route);
    const agentModel = useSol ? "gpt-5.6-sol" : "gpt-5.6-terra";
    const reasoningEffort = useSol ? "medium" : "low";

    const agentResponse = await client.responses.create({
      model: agentModel,
      reasoning: {
        effort: reasoningEffort,
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
      capability,
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
