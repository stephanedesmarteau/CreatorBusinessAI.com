export type BusinessFactoryReservation = {
  requestHash: string | null;
  sourceProjectId: string | null;
  generatedProjectId: string | null;
  status: string;
  updatedAt: Date;
};

export type BusinessFactoryDecision =
  | "CONFLICT"
  | "REUSE"
  | "BLOCKED"
  | "INTERRUPTED";

const STALE_RESERVATION_MS = 15 * 60 * 1000;

export function decideBusinessFactoryReservation(
  existing: BusinessFactoryReservation,
  requestHash: string,
  sourceProjectId: string | null,
  now: number = Date.now()
): BusinessFactoryDecision {
  if (
    !existing.requestHash ||
    existing.requestHash !== requestHash ||
    existing.sourceProjectId !== sourceProjectId
  ) {
    return "CONFLICT";
  }

  if (
    existing.status === "COMPLETED" &&
    existing.generatedProjectId
  ) {
    return "REUSE";
  }

  if (
    existing.status === "RESERVED" &&
    now - existing.updatedAt.getTime() >
      STALE_RESERVATION_MS
  ) {
    return "INTERRUPTED";
  }

  return "BLOCKED";
}
