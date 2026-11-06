export function canonicalizeBusinessFactory(
  value: unknown
): string {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new Error("Plan Business Factory invalide.");
  }

  function normalize(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map(normalize);
    }

    if (
      input !== null &&
      typeof input === "object"
    ) {
      const record = input as Record<string, unknown>;

      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, normalize(record[key])])
      );
    }

    return input;
  }

  return JSON.stringify(
    normalize(JSON.parse(serialized))
  );
}
