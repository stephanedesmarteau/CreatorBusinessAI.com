import OpenAI from "openai";
import { getAIModel } from "@/lib/ai/providers";
import type {
  BusinessFactoryDeliverable,
  BusinessFactoryInput,
  BusinessFactorySpec,
} from "./types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => clean(item))
    .filter(Boolean);
}

function createDeliverables(): BusinessFactoryDeliverable[] {
  return [
    {
      type: "strategy",
      title: "Stratégie d'entreprise",
      description:
        "Positionnement, proposition de valeur et plan stratégique.",
      required: true,
      status: "ready",
    },
    {
      type: "market",
      title: "Marché et validation",
      description:
        "Marché cible, concurrence, hypothèses et plan de validation.",
      required: true,
      status: "ready",
    },
    {
      type: "brand",
      title: "Identité de marque",
      description:
        "Message, positionnement et fondations de marque.",
      required: true,
      status: "planned",
    },
    {
      type: "website",
      title: "Site web",
      description:
        "Présence web professionnelle orientée conversion.",
      required: false,
      status: "planned",
    },
    {
      type: "web-app",
      title: "Application web",
      description:
        "Produit numérique interactif lorsque le projet le nécessite.",
      required: false,
      status: "planned",
    },
    {
      type: "mobile-app",
      title: "Application mobile",
      description:
        "Expérience mobile iOS et Android lorsque pertinente.",
      required: false,
      status: "planned",
    },
    {
      type: "marketing",
      title: "Marketing et acquisition",
      description:
        "Canaux, contenu, acquisition et conversion.",
      required: true,
      status: "planned",
    },
    {
      type: "seo",
      title: "SEO",
      description:
        "Architecture de contenu et acquisition organique.",
      required: true,
      status: "planned",
    },
    {
      type: "sales",
      title: "Système de ventes",
      description:
        "Processus commercial et conversion des prospects.",
      required: true,
      status: "planned",
    },
    {
      type: "finance",
      title: "Plan financier",
      description:
        "Budget, besoins financiers, revenus, coûts et KPI.",
      required: true,
      status: "planned",
    },
    {
      type: "operations",
      title: "Plan opérationnel",
      description:
        "Exécution, priorités, risques et jalons.",
      required: true,
      status: "planned",
    },
    {
      type: "automation",
      title: "Automatisation",
      description:
        "Opportunités d'automatisation des opérations.",
      required: false,
      status: "planned",
    },
  ];
}

export async function buildBusinessFactorySpec(
  input: BusinessFactoryInput
): Promise<BusinessFactorySpec> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("La clé API OpenAI est manquante.");
  }

  const now = new Date().toISOString();

  const response = await client.responses.create({
    model: getAIModel("businessDefault").id,
    reasoning: {
      effort: "medium",
    },
    input: [
      {
        role: "developer",
        content: `
Tu es le moteur Business Factory de CreatorBusinessAI.

Transforme le projet fourni en spécification d'entreprise structurée,
réaliste et directement exploitable.

Réponds UNIQUEMENT avec un objet JSON valide.
Aucun markdown.
Aucun texte avant ou après le JSON.

Le JSON doit respecter exactement cette structure :

{
  "strategy": {
    "executiveSummary": "string",
    "problem": "string",
    "targetAudience": "string",
    "valueProposition": "string",
    "positioning": "string",
    "competitiveAdvantage": "string"
  },
  "market": {
    "opportunity": "string",
    "competitors": ["string"],
    "assumptions": ["string"],
    "validationPlan": ["string"]
  },
  "businessModel": {
    "revenueModel": "string",
    "pricing": "string",
    "acquisition": "string",
    "sales": "string"
  },
  "marketing": {
    "message": "string",
    "channels": ["string"],
    "contentPlan": ["string"],
    "seoPlan": ["string"]
  },
  "finance": {
    "recommendedBudget": "string",
    "fundingNeeds": "string",
    "revenueTargets": ["string"],
    "costDrivers": ["string"],
    "kpis": ["string"]
  },
  "execution": {
    "days30": ["string"],
    "days60": ["string"],
    "days90": ["string"],
    "priorities": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "priority": "critical|high|medium|low",
        "owner": "string",
        "timeframe": "string"
      }
    ],
    "risks": ["string"]
  },
  "digital": {
    "recommendedProduct": "website|web-app|mobile-app|website-and-app|none",
    "coreFeatures": ["string"],
    "integrations": ["string"],
    "automationOpportunities": ["string"]
  }
}

Règles :
- Ne promets pas de résultats irréalistes.
- Signale les hypothèses implicitement dans assumptions.
- Les recommandations doivent être concrètes.
- Les priorités doivent être ordonnées par importance.
- Le produit numérique recommandé doit correspondre au besoin réel.
- Réponds dans la langue demandée par le projet.
        `.trim(),
      },
      {
        role: "user",
        content: `
Projet : ${input.projectName}

Idée :
${input.idea}

Secteur :
${input.industry || "Non précisé"}

Marché cible :
${input.targetMarket || "Non précisé"}

Budget :
${input.budget || "Non précisé"}

Objectif principal :
${input.mainGoal || "Non précisé"}

Langue :
${input.language || "fr"}
        `.trim(),
      },
    ],
  });

  let parsed: Record<string, any>;

  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error(
      "Business Factory a retourné une réponse JSON invalide."
    );
  }

  const allowedPriorities = new Set([
    "critical",
    "high",
    "medium",
    "low",
  ]);

  const priorities = Array.isArray(parsed.execution?.priorities)
    ? parsed.execution.priorities.map(
        (item: Record<string, unknown>, index: number) => {
          const rawPriority = clean(item.priority);

          return {
            id: clean(item.id) || `priority-${index + 1}`,
            title: clean(item.title),
            description: clean(item.description),
            priority: allowedPriorities.has(rawPriority)
              ? (rawPriority as
                  | "critical"
                  | "high"
                  | "medium"
                  | "low")
              : "medium",
            owner: clean(item.owner) || "Fondateur",
            timeframe: clean(item.timeframe),
          };
        }
      )
    : [];

  const recommendedProductValues = new Set([
    "website",
    "web-app",
    "mobile-app",
    "website-and-app",
    "none",
  ]);

  const rawRecommendedProduct = clean(
    parsed.digital?.recommendedProduct
  );

  const recommendedProduct =
    recommendedProductValues.has(rawRecommendedProduct)
      ? (rawRecommendedProduct as
          | "website"
          | "web-app"
          | "mobile-app"
          | "website-and-app"
          | "none")
      : "website";

  return {
    version: "1.0",
    status: "ready",

    project: {
      projectId: input.projectId || null,
      name: clean(input.projectName),
      idea: clean(input.idea),
      industry: clean(input.industry),
      targetMarket: clean(input.targetMarket),
      budget: clean(input.budget),
      mainGoal: clean(input.mainGoal),
      language: clean(input.language) || "fr",
    },

    strategy: {
      executiveSummary: clean(
        parsed.strategy?.executiveSummary
      ),
      problem: clean(parsed.strategy?.problem),
      targetAudience: clean(
        parsed.strategy?.targetAudience
      ),
      valueProposition: clean(
        parsed.strategy?.valueProposition
      ),
      positioning: clean(parsed.strategy?.positioning),
      competitiveAdvantage: clean(
        parsed.strategy?.competitiveAdvantage
      ),
    },

    market: {
      opportunity: clean(parsed.market?.opportunity),
      competitors: stringArray(parsed.market?.competitors),
      assumptions: stringArray(parsed.market?.assumptions),
      validationPlan: stringArray(
        parsed.market?.validationPlan
      ),
    },

    businessModel: {
      revenueModel: clean(
        parsed.businessModel?.revenueModel
      ),
      pricing: clean(parsed.businessModel?.pricing),
      acquisition: clean(
        parsed.businessModel?.acquisition
      ),
      sales: clean(parsed.businessModel?.sales),
    },

    marketing: {
      message: clean(parsed.marketing?.message),
      channels: stringArray(parsed.marketing?.channels),
      contentPlan: stringArray(
        parsed.marketing?.contentPlan
      ),
      seoPlan: stringArray(parsed.marketing?.seoPlan),
    },

    finance: {
      recommendedBudget: clean(
        parsed.finance?.recommendedBudget
      ),
      fundingNeeds: clean(parsed.finance?.fundingNeeds),
      revenueTargets: stringArray(
        parsed.finance?.revenueTargets
      ),
      costDrivers: stringArray(parsed.finance?.costDrivers),
      kpis: stringArray(parsed.finance?.kpis),
    },

    execution: {
      days30: stringArray(parsed.execution?.days30),
      days60: stringArray(parsed.execution?.days60),
      days90: stringArray(parsed.execution?.days90),
      priorities,
      risks: stringArray(parsed.execution?.risks),
    },

    digital: {
      recommendedProduct,
      coreFeatures: stringArray(
        parsed.digital?.coreFeatures
      ),
      integrations: stringArray(
        parsed.digital?.integrations
      ),
      automationOpportunities: stringArray(
        parsed.digital?.automationOpportunities
      ),
    },

    deliverables: createDeliverables(),

    metadata: {
      createdAt: now,
      updatedAt: now,
      source: "creatorbusinessai-business-factory",
    },
  };
}
