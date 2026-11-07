import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiText, InvalidAIRequest, readAIJson } from "@/lib/ai/request-validation";
import { getAIModel } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const body = await readAIJson(request);

    const idea = aiText(body.idea);
    const industry = aiText(body.industry);
    const market = aiText(body.market);
    const budget = aiText(body.budget);
    const goal = aiText(body.goal);

    if (!idea) {
      return NextResponse.json(
        { error: "Veuillez décrire votre idée d'entreprise." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      max_output_tokens: 6000,
      model: getAIModel("businessDefault").id,
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "developer",
          content: `
Tu es CreatorBusinessAI, un conseiller stratégique spécialisé dans
la création et le développement d'entreprises.

Tu dois répondre en français clair, professionnel et concret.

Analyse le projet fourni par l'utilisateur et produis un plan structuré
avec exactement les sections suivantes :

# Score de viabilité
Donne une note sur 100 avec une justification concise.

# Verdict stratégique
Choisis clairement : GO, À VALIDER ou NO-GO, puis explique pourquoi.

# Résumé exécutif
Résume le potentiel du projet, les principales contraintes et l'opportunité.

# Analyse de l'idée
# Problème client à résoudre
# Clientèle cible
# Proposition de valeur
# Modèle de revenus
# Analyse du marché
# Analyse de la concurrence
# Positionnement
# Avantage concurrentiel

# Stratégie marketing
Décris les canaux prioritaires, le message principal et une approche d'acquisition réaliste.

# Plan 30 jours
Donne des actions concrètes et prioritaires.

# Plan 60 jours
Donne des objectifs mesurables.

# Plan 90 jours
Donne les étapes permettant de valider ou accélérer le projet.

# Budget recommandé
Distingue si possible : développement, marketing, opérations et réserve.

# Besoins financiers
Explique le capital réellement nécessaire pour atteindre le prochain jalon important.

# KPIs à suivre
Donne les indicateurs clés les plus utiles.

# Principaux risques
Classe les risques par importance et propose une mesure de réduction pour chacun.

# Hypothèses à valider
Indique clairement ce qui doit être testé avant d'investir davantage.

# 5 actions prioritaires
Donne exactement cinq actions concrètes, classées de 1 à 5.

# Opportunités de croissance
Indique les meilleures pistes de croissance après validation du MVP.

# Recommandation finale CreatorBusinessAI
Termine par une recommandation courte, claire et directement exploitable.

Évite les promesses irréalistes.
Quand une donnée manque, formule une hypothèse raisonnable et indique
clairement qu'il s'agit d'une hypothèse.
          `.trim(),
        },
        {
          role: "user",
          content: `
Idée d'entreprise :
${idea}

Secteur :
${industry || "Non précisé"}

Marché cible :
${market || "Non précisé"}

Budget :
${budget || "Non précisé"}

Objectif principal :
${goal || "Non précisé"}

Prépare le plan d'affaires demandé.
          `.trim(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      plan: response.output_text,
    });
  } catch (error) {
    if (error instanceof InvalidAIRequest) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erreur Business Builder:", error);

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue pendant la génération du plan d'affaires.",
      },
      { status: 500 }
    );
  }
}
