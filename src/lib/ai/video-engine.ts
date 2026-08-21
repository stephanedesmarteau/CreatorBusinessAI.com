import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type VideoSize =
  | "720x1280"
  | "1280x720"
  | "1024x1792"
  | "1792x1024";

export type VideoSeconds = "4" | "8" | "12";

export async function generateVideo(
  prompt: string,
  size: VideoSize = "1280x720",
  seconds: VideoSeconds = "8",
  model: "sora-2" | "sora-2-pro" = "sora-2"
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("La clé API OpenAI est manquante.");
  }

  const video = await client.videos.create({
    model,
    prompt,
    size,
    seconds,
  });

  return {
    id: video.id,
    status: video.status,
    progress: video.progress ?? 0,
    model: video.model,
    size: video.size,
    seconds: video.seconds,
  };
}
