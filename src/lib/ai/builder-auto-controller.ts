import type {
  ValidationReport,
} from "./builder-validator";

export type BuilderAutoDecision =
  | "ready"
  | "needs-approval"
  | "max-attempts";

export type BuilderAutoControllerResult = {
  decision: BuilderAutoDecision;
  canAttemptRepair: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  errors: number;
  warnings: number;
  score: number;
  message: string;
};

export function evaluateBuilderProject(
  report: ValidationReport,
  attemptsUsed = 0
): BuilderAutoControllerResult {
  const maxAttempts = 2;

  if (
    !Number.isInteger(attemptsUsed) ||
    attemptsUsed < 0
  ) {
    throw new Error(
      "Nombre de tentatives invalide."
    );
  }

  const base = {
    attemptsUsed,
    maxAttempts,
    errors: report.errors,
    warnings: report.warnings,
    score: report.score,
  };

  if (report.valid && report.errors === 0) {
    return {
      ...base,
      decision: "ready",
      canAttemptRepair: false,
      message:
        "Validation réussie. Le projet peut passer à la compilation.",
    };
  }

  if (attemptsUsed >= maxAttempts) {
    return {
      ...base,
      decision: "max-attempts",
      canAttemptRepair: false,
      message:
        "Limite de corrections atteinte. Intervention manuelle requise.",
    };
  }

  return {
    ...base,
    decision: "needs-approval",
    canAttemptRepair: true,
    message:
      "Des erreurs ont été détectées. Une autorisation est requise avant toute correction IA.",
  };
}
