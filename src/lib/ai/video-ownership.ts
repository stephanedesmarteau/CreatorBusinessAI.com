import { prisma } from "@/lib/db/prisma";

// Seule la génération serveur renseigne cette clé ; jamais les données du client.
export function videoStorageKey(videoId: string) {
  return `openai-video:${videoId}`;
}

export async function ownsVideo(videoId: string, clerkUserId: string) {
  const asset = await prisma.fileAsset.findFirst({
    where: {
      storageKey: videoStorageKey(videoId),
      mimeType: "video/mp4",
      workspace: { owner: { clerkUserId } },
    },
    select: { id: true },
  });

  return asset !== null;
}
