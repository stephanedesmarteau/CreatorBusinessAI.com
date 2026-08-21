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

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        status: video.status,
        progress: video.progress ?? 0,
        model: video.model,
        size: video.size,
        seconds: video.seconds,
        error: video.error ?? null,
      },
    });
  } catch (error) {
    console.error("Erreur Video Status:", error);

    return NextResponse.json(
      {
        error: "Impossible de récupérer le statut de la vidéo.",
      },
      { status: 500 }
    );
  }
}

