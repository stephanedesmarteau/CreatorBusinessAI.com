export class InvalidAIRequest extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

// Limite en octets, y compris pour les requêtes sans Content-Length.
export async function readAIJson(request: Request): Promise<Record<string, unknown>> {
  const limit = 64 * 1024;
  if (Number(request.headers.get("content-length")) > limit) {
    throw new InvalidAIRequest("Demande trop volumineuse.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidAIRequest("Corps JSON requis.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new InvalidAIRequest("Demande trop volumineuse.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Objet requis");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new InvalidAIRequest("Corps JSON invalide.");
  }
}

export function aiText(value: unknown, maxLength = 12000): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new InvalidAIRequest("Texte invalide.");
  const text = value.trim();
  if (text.length > maxLength) throw new InvalidAIRequest("Texte trop long.", 413);
  return text;
}
