import type {
  BusinessFactorySpec,
} from "./types";

function section(
  title: string,
  values: string[]
) {
  const cleanValues = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (!cleanValues.length) {
    return "";
  }

  return [
    `## ${title}`,
    ...cleanValues.map(
      (value) => `- ${value}`
    ),
  ].join("\n");
}

export type BusinessFactoryBuildHandoff = {
  sourceProjectId: string | null;
  createNewProject: true;
  recommendedProduct:
    BusinessFactorySpec["digital"]["recommendedProduct"];
  prompt: string;
};

export function createBusinessFactoryBuildHandoff(
  factory: BusinessFactorySpec
): BusinessFactoryBuildHandoff {
  const project = factory.project;

  const prompt = [
    "# CREATORBUSINESSAI — DIGITAL PRODUCTION SPEC",
    "",
    "Construis une application complète, professionnelle et réellement fonctionnelle à partir de cette Business Factory.",
    "",
    "IMPORTANT:",
    "- Crée un NOUVEAU projet généré.",
    "- Ne modifie jamais le projet source de l'analyse.",
    "- Produis du vrai code exécutable.",
    "- L'interface doit être responsive, moderne et accessible.",
    "- Préserve une architecture claire et maintenable.",
    "- Ne simule pas les fonctionnalités principales.",
    "",
    "## PROJET",
    `Nom: ${project.name}`,
    `Idée: ${project.idea}`,
    `Secteur: ${project.industry}`,
    `Marché cible: ${project.targetMarket}`,
    `Budget: ${project.budget}`,
    `Objectif principal: ${project.mainGoal}`,
    `Langue principale: ${project.language}`,
    "",
    "## PRODUIT NUMÉRIQUE",
    `Produit recommandé: ${factory.digital.recommendedProduct}`,
    "",
    "## STRATÉGIE",
    factory.strategy.executiveSummary,
    "",
    `Problème: ${factory.strategy.problem}`,
    `Clientèle cible: ${factory.strategy.targetAudience}`,
    `Proposition de valeur: ${factory.strategy.valueProposition}`,
    `Positionnement: ${factory.strategy.positioning}`,
    `Avantage concurrentiel: ${factory.strategy.competitiveAdvantage}`,
    "",
    "## MODÈLE D'AFFAIRES",
    `Revenus: ${factory.businessModel.revenueModel}`,
    `Tarification: ${factory.businessModel.pricing}`,
    `Acquisition: ${factory.businessModel.acquisition}`,
    `Ventes: ${factory.businessModel.sales}`,
    "",
    "## MARKETING",
    factory.marketing.message,
    "",
    section(
      "CANAUX MARKETING",
      factory.marketing.channels
    ),
    "",
    section(
      "PLAN DE CONTENU",
      factory.marketing.contentPlan
    ),
    "",
    section(
      "SEO",
      factory.marketing.seoPlan
    ),
    "",
    section(
      "FONCTIONNALITÉS PRINCIPALES",
      factory.digital.coreFeatures
    ),
    "",
    section(
      "INTÉGRATIONS",
      factory.digital.integrations
    ),
    "",
    section(
      "AUTOMATISATIONS",
      factory.digital.automationOpportunities
    ),
    "",
    section(
      "KPIs",
      factory.finance.kpis
    ),
    "",
    section(
      "RISQUES À PRENDRE EN COMPTE",
      factory.execution.risks
    ),
    "",
    "## EXIGENCES DE PRODUCTION",
    "- Créer une expérience utilisateur complète et cohérente.",
    "- Prévoir les états chargement, vide, succès et erreur.",
    "- Ajouter une navigation professionnelle.",
    "- Utiliser des composants réutilisables.",
    "- Utiliser TypeScript.",
    "- Préparer le projet pour un vrai build Next.js.",
    "- Ne jamais inclure de secrets dans le code client.",
    "- Préparer les intégrations externes proprement lorsque des clés sont nécessaires.",
    "- Construire d'abord le MVP réellement utile avant les fonctions secondaires.",
    "",
    "## OBJECTIF FINAL",
    "Livrer un projet numérique exploitable comme base réelle de production, et non une simple maquette.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    sourceProjectId:
      factory.project.projectId ?? null,
    createNewProject: true,
    recommendedProduct:
      factory.digital.recommendedProduct,
    prompt,
  };
}
