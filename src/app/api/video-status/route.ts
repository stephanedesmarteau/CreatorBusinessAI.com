import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ownsVideo } from "@/lib/ai/video-ownership";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

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

    if (!(await ownsVideo(videoId, userId))) {
      return NextResponse.json(
        { error: "Vidéo introuvable." },
        { status: 404 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
    }, { headers: { "Cache-Control": "private, no-store" } });
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

