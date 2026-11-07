import OpenAI from "openai";
import { getAIModel } from "@/lib/ai/providers";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import { prisma } from "@/lib/db/prisma";
import { videoStorageKey } from "./video-ownership";

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
  model?: "sora-2" | "sora-2-pro"
) {
  const workspace = await getOrCreateUserWorkspace();
  if (!workspace) throw new Error("Authentification requise.");

  const selectedModel =
    model ??
    (getAIModel("video").id as
      | "sora-2"
      | "sora-2-pro");
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("La clé API OpenAI est manquante.");
  }

  if (
    !prompt.trim() ||
    !["720x1280", "1280x720", "1024x1792", "1792x1024"].includes(size) ||
    !["4", "8", "12"].includes(seconds) ||
    !["sora-2", "sora-2-pro"].includes(selectedModel)
  ) {
    throw new Error("Paramètres vidéo invalides.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const video = await client.videos.create({
    model: selectedModel,
    prompt,
    size,
    seconds,
  });

  // Ne renvoyer l'identifiant qu'après enregistrement durable du propriétaire.
  await prisma.fileAsset.create({
    data: {
      workspaceId: workspace.id,
      name: `video/${video.id}.mp4`,
      mimeType: "video/mp4",
      storageKey: videoStorageKey(video.id),
      status: "PROCESSING",
    },
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
