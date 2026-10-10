export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

export function isRetryableError(
  error: unknown
): boolean {
  const e = error as {
    status?: number;
    code?: string;
  } | null;

  const status = e?.status;

  if (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" &&
      status >= 500 &&
      status <= 599)
  ) {
    return true;
  }

  return (
    e?.code === "ETIMEDOUT" ||
    e?.code === "ECONNRESET" ||
    e?.code === "ECONNREFUSED"
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.min(
    2,
    Math.max(1, options.maxAttempts ?? 2)
  );

  const baseDelayMs = Math.min(
    5000,
    Math.max(0, options.baseDelayMs ?? 1000)
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt === maxAttempts ||
        !isRetryableError(error)
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * attempt)
      );
    }
  }

  throw new Error("Nombre maximal de tentatives atteint.");
}
