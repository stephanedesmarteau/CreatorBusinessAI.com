import { orchestrate } from "@/lib/ai/orchestrator";
import type { OrchestratorResult } from "@/lib/ai/orchestrator";
import type {
  BusinessFactoryDeliverable,
  BusinessFactoryDeliverableType,
  BusinessFactorySpec,
} from "./types";

export type BusinessFactoryExecutionResult = {
  type: BusinessFactoryDeliverableType;
  title: string;
  status: "completed" | "failed";
  mission: string;
  output: string;
  orchestrator?: OrchestratorResult;
  error?: string;
};

export type BusinessFactoryExecution = {
  projectName: string;
  status: "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string;
  totalDeliverables: number;
  completedDeliverables: number;
  failedDeliverables: number;
  results: BusinessFactoryExecutionResult[];
};

const DIGITAL_TYPES = new Set<BusinessFactoryDeliverableType>([
  "website",
  "web-app",
  "mobile-app",
]);

function shouldExecuteDeliverable(
  factory: BusinessFactorySpec,
  deliverable: BusinessFactoryDeliverable
) {
  if (deliverable.required) {
    return true;
  }

  if (deliverable.type === "automation") {
    return factory.digital.automationOpportunities.length > 0;
  }

  if (!DIGITAL_TYPES.has(deliverable.type)) {
    return false;
  }

  const recommended = factory.digital.recommendedProduct;

  if (recommended === "website-and-app") {
    return (
      deliverable.type === "website" ||
      deliverable.type === "web-app"
    );
  }

  return deliverable.type === recommended;
}

function createMission(
  factory: BusinessFactorySpec,
  deliverable: BusinessFactoryDeliverable
) {
  const project = factory.project;

  const commonContext = `
PROJET
${project.name}

IDÉE
${project.idea}

SECTEUR
${project.industry || "Non précisé"}

MARCHÉ CIBLE
${project.targetMarket || "Non précisé"}

BUDGET
${project.budget || "Non précisé"}

OBJECTIF PRINCIPAL
${project.mainGoal || "Non précisé"}

PROPOSITION DE VALEUR
${factory.strategy.valueProposition}

POSITIONNEMENT
${factory.strategy.positioning}

CLIENTÈLE
${factory.strategy.targetAudience}

MODÈLE DE REVENUS
${factory.businessModel.revenueModel}

PRIX
${factory.businessModel.pricing}

PRODUIT NUMÉRIQUE RECOMMANDÉ
${factory.digital.recommendedProduct}

FONCTIONS PRINCIPALES
${factory.digital.coreFeatures.join("\n") || "Aucune précisée"}

INTÉGRATIONS
${factory.digital.integrations.join("\n") || "Aucune précisée"}

AUTOMATISATIONS
${factory.digital.automationOpportunities.join("\n") || "Aucune précisée"}

RISQUES
${factory.execution.risks.join("\n") || "Aucun précisé"}
  `.trim();

  const missions: Record<
    BusinessFactoryDeliverableType,
    string
  > = {
    strategy: `
Finalise la stratégie d'entreprise de ${project.name}.
Produis les décisions stratégiques prioritaires, le positionnement,
la proposition de valeur, les objectifs et le plan d'exécution.
Ne répète pas simplement les données existantes : transforme-les
en décisions directement exploitables.
    `.trim(),

    market: `
Approfondis le marché et la validation de ${project.name}.
Évalue les hypothèses, les segments prioritaires, la concurrence,
les risques de marché et propose un plan concret de validation.
Utilise la recherche réelle lorsque des faits récents sont nécessaires.
    `.trim(),

    brand: `
Construis les fondations de marque de ${project.name}.
Définis identité, promesse, personnalité, message principal,
ton éditorial, différenciation et recommandations de communication.
    `.trim(),

    website: `
Prépare la stratégie de production du site web de ${project.name}.
Définis architecture, pages, parcours utilisateur, conversions,
contenu essentiel, SEO, fonctionnalités et critères de qualité.
Le résultat doit être exploitable par le Builder CreatorBusinessAI.
    `.trim(),

    "web-app": `
Prépare la stratégie de production de l'application web de ${project.name}.
Définis utilisateurs, parcours, fonctionnalités MVP, écrans,
données, intégrations, automatisations, sécurité et critères
d'acceptation. Le résultat doit être exploitable par le Builder.
    `.trim(),

    "mobile-app": `
Prépare la stratégie produit mobile iOS et Android de ${project.name}.
Définis parcours mobiles, fonctionnalités MVP, écrans,
notifications, données, intégrations, sécurité et contraintes
de publication. Le résultat doit être exploitable par une future
Mobile Factory CreatorBusinessAI.
    `.trim(),

    marketing: `
Construis le système marketing et acquisition de ${project.name}.
Définis message, canaux, campagnes, contenu, conversion,
expériences de validation et indicateurs mesurables.
    `.trim(),

    seo: `
Construis le plan SEO de ${project.name}.
Définis architecture sémantique, groupes de sujets,
pages prioritaires, contenu, SEO local si pertinent,
SEO technique et métriques de progression.
    `.trim(),

    sales: `
Construis le système de ventes de ${project.name}.
Définis offre, qualification, pipeline, argumentaire,
objections, suivi, conversion, rétention et métriques.
    `.trim(),

    finance: `
Construis le plan financier opérationnel de ${project.name}.
Travaille le budget, coûts, hypothèses de revenus,
seuils de validation, besoins de financement,
unit economics et indicateurs financiers.
Ne présente aucune hypothèse comme un résultat garanti.
    `.trim(),

    operations: `
Construis le système opérationnel de ${project.name}.
Transforme les priorités 30/60/90 jours en processus,
responsabilités, jalons, contrôles, risques et métriques.
    `.trim(),

    automation: `
Conçois le plan d'automatisation de ${project.name}.
Identifie les tâches répétitives, déclencheurs,
données, intégrations, contrôles humains,
exceptions et automatisations prioritaires.
    `.trim(),
  };

  return `
CREATORBUSINESSAI — BUSINESS FACTORY

LIVRABLE
${deliverable.title}

MISSION
${missions[deliverable.type]}

CONTEXTE COMPLET
${commonContext}

RÈGLES
- Produis un résultat concret et directement exploitable.
- Respecte le budget et le marché cible.
- Distingue faits, hypothèses et recommandations.
- Ne promets aucun résultat financier ou commercial.
- Priorise un MVP réaliste avant les fonctions secondaires.
- Réponds en ${project.language || "fr"}.
  `.trim();
}

export async function executeBusinessFactory(
  factory: BusinessFactorySpec
): Promise<BusinessFactoryExecution> {
  const startedAt = new Date().toISOString();

  const deliverables = factory.deliverables.filter(
    (deliverable) =>
      shouldExecuteDeliverable(factory, deliverable)
  );

  const results: BusinessFactoryExecutionResult[] = [];

  /*
   * Exécution par vagues afin de ne pas lancer tous les
   * orchestrateurs lourds simultanément.
   */
  const waveSize = 3;

  for (let index = 0; index < deliverables.length; index += waveSize) {
    const wave = deliverables.slice(index, index + waveSize);

    const waveResults = await Promise.all(
      wave.map(async (deliverable) => {
        const mission = createMission(factory, deliverable);

        try {
          const orchestrator = await orchestrate(mission);

          return {
            type: deliverable.type,
            title: deliverable.title,
            status: "completed" as const,
            mission,
            output: orchestrator.result,
            orchestrator,
          };
        } catch (error) {
          return {
            type: deliverable.type,
            title: deliverable.title,
            status: "failed" as const,
            mission,
            output: "",
            error:
              error instanceof Error
                ? error.message
                : "Erreur inconnue pendant l'exécution.",
          };
        }
      })
    );

    results.push(...waveResults);
  }

  const completedDeliverables = results.filter(
    (result) => result.status === "completed"
  ).length;

  const failedDeliverables =
    results.length - completedDeliverables;

  const status =
    completedDeliverables === results.length
      ? "completed"
      : completedDeliverables > 0
        ? "partial"
        : "failed";

  return {
    projectName: factory.project.name,
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    totalDeliverables: results.length,
    completedDeliverables,
    failedDeliverables,
    results,
  };
}
