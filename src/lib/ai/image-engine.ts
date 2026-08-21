import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImage(
  prompt: string,
  size = "1024x1024"
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("La clé API OpenAI est manquante.");
  }

  const result = await client.images.generate({
    model: "gpt-image-2",
    prompt,
    size: size as "1024x1024" | "1536x1024" | "1024x1536",
    quality: "medium",
  });

  const image = result.data?.[0];

  if (!image) {
    throw new Error("Aucune image n'a été générée.");
  }

  if (image.b64_json) {
    return {
      type: "base64" as const,
      data: image.b64_json,
      mimeType: "image/png",
    };
  }

  if (image.url) {
    return {
      type: "url" as const,
      data: image.url,
      mimeType: "image/png",
    };
  }

  throw new Error("Format d'image inattendu.");
}
