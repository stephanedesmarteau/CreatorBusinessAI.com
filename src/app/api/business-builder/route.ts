import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const idea = String(body.idea ?? "").trim();
    const industry = String(body.industry ?? "").trim();
    const market = String(body.market ?? "").trim();
    const budget = String(body.budget ?? "").trim();
    const goal = String(body.goal ?? "").trim();

    if (!idea) {
      return NextResponse.json(
        { error: "Veuillez décrire votre idée d'entreprise." },
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
# Analyse de l'idée
# Clientèle cible
# Proposition de valeur
# Modèle de revenus
# Analyse du marché
# Positionnement
# Avantage concurrentiel
# Stratégie marketing
# Plan 30 jours
# Plan 60 jours
# Plan 90 jours
# Budget recommandé
# KPIs à suivre
# Principaux risques
# Hypothèses à valider
# Prochaines étapes prioritaires

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
