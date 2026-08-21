import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("id");

    if (!videoId) {
      return NextResponse.json(
        { error: "ID vidéo manquant." },
        { status: 400 }
      );
    }

    const video = await client.videos.retrieve(videoId);

    if (video.status !== "completed") {
      return NextResponse.json(
        {
          error: "La vidéo n'est pas encore terminée.",
          status: video.status,
          progress: video.progress ?? 0,
        },
        { status: 409 }
      );
    }

    const content = await client.videos.downloadContent(videoId);
    const buffer = await content.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="CreatorBusinessAI-${videoId}.mp4"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Erreur Video Content:", error);

    return NextResponse.json(
      {
        error: "Impossible de récupérer le contenu de la vidéo.",
      },
      { status: 500 }
    );
  }
}
