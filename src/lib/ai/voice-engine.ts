import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type VoiceName =
  | "alloy"
  | "ash"
  | "ballad"
  | "cedar"
  | "coral"
  | "echo"
  | "fable"
  | "marin"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer"
  | "verse";

export async function generateVoice(
  text: string,
  voice: VoiceName = "cedar"
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("La clé API OpenAI est manquante.");
  }

  if (!text.trim()) {
    throw new Error("Le texte à convertir en voix est vide.");
  }

  const speech = await client.audio.speech.create({
    model: "gpt-4o-mini-tts-2025-12-15",
    voice,
    input: text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await speech.arrayBuffer());

  return {
    type: "base64" as const,
    data: buffer.toString("base64"),
    mimeType: "audio/mpeg",
    voice,
  };
}

