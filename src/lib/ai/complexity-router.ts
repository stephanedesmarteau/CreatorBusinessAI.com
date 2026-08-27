export type ComplexityRoute = "simple" | "complex";

export type ComplexityDecision = {
  route: ComplexityRoute;
  score: number;
  reasons: string[];
};

const complexSignals = [
  "analyse le marché",
  "étude de marché",
  "recherche récente",
  "recherche approfondie",
  "compare les concurrents",
  "analyse des concurrents",
  "business plan",
  "modèle économique",
  "strategie marketing",
  "stratégie marketing",
  "plan d'exécution",
  "plan d execution",
  "feuille de route",
  "analyse complète",
  "analyse approfondie",
  "plusieurs agents",
  "multi-agents",
];

const sequenceSignals = [
  "puis",
  "ensuite",
  "après",
  "à partir de",
  "a partir de",
  "en utilisant",
  "termine par",
  "finalement",
];

export function evaluateComplexity(
  message: string
): ComplexityDecision {
  const text = message.trim().toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  const complexMatches = complexSignals.filter(
    (signal) => text.includes(signal)
  );

  if (complexMatches.length > 0) {
    score += Math.min(complexMatches.length * 2, 6);
    reasons.push(
      `${complexMatches.length} signal(s) de mission complexe`
    );
  }

  const sequenceMatches = sequenceSignals.filter(
    (signal) => text.includes(signal)
  );

  if (sequenceMatches.length >= 2) {
    score += 3;
    reasons.push(
      "mission comportant plusieurs étapes dépendantes"
    );
  } else if (sequenceMatches.length === 1) {
    score += 1;
  }

  if (text.length > 500) {
    score += 2;
    reasons.push("demande longue");
  } else if (text.length > 250) {
    score += 1;
  }

  const separators =
    (
      text.match(
        /(?:,|;|\bpuis\b|\bensuite\b|\bet\b)/g
      ) || []
    ).length;

  if (separators >= 5) {
    score += 2;
    reasons.push("plusieurs objectifs détectés");
  }

  const route: ComplexityRoute =
    score >= 5 ? "complex" : "simple";

  if (!reasons.length) {
    reasons.push(
      "aucun besoin multi-agents important détecté"
    );
  }

  return {
    route,
    score,
    reasons,
  };
}
