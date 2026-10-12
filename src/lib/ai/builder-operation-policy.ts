export const BUILDER_REPAIR_LIMIT = 2;

export const BUILDER_OPERATION_TYPES = [
  "build-repair",
  "validation-repair",
  "manual-edit",
] as const;

export type BuilderOperationType =
  (typeof BUILDER_OPERATION_TYPES)[number];

export function isBuilderOperationType(
  value: unknown
): value is BuilderOperationType {
  return (
    typeof value === "string" &&
    BUILDER_OPERATION_TYPES.some(
      (operation) => operation === value
    )
  );
}

export function isRepairOperation(
  operation: BuilderOperationType
): boolean {
  return (
    operation === "build-repair" ||
    operation === "validation-repair"
  );
}

export function canReserveRepair(
  attemptsUsed: number
): boolean {
  return (
    Number.isInteger(attemptsUsed) &&
    attemptsUsed >= 0 &&
    attemptsUsed < BUILDER_REPAIR_LIMIT
  );
}
