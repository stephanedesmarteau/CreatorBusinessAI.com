import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIModel } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const maxAudioBytes = 20 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > maxAudioBytes + 65536) {
      return NextResponse.json({ error: "Fichier audio trop volumineux." }, { status: 413 });
    }
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Formulaire audio invalide." }, { status: 400 });
    }
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier audio valide n'a été fourni." },
        { status: 400 }
      );
    }

    if (audio.size === 0 || audio.size > maxAudioBytes) {
      return NextResponse.json({ error: "Taille du fichier audio invalide." }, { status: audio.size > maxAudioBytes ? 413 : 400 });
    }
    const allowedTypes = ["audio/webm", "video/webm", "audio/mpeg", "audio/mp3", "audio/mp4", "video/mp4", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/ogg", "audio/flac", "audio/x-flac"];
    if (!allowedTypes.includes(audio.type.split(";")[0].toLowerCase())) {
      return NextResponse.json({ error: "Format audio non pris en charge." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await client.audio.transcriptions.create({
      model: getAIModel("transcription").id,
      file: audio,
    });

    return NextResponse.json({
      success: true,
      text: transcription.text,
    });
  } catch (error) {
    console.error("Erreur transcription audio:", error);

    return NextResponse.json(
      {
        error: "Impossible de transcrire le fichier audio.",
      },
      { status: 500 }
    );
 
  }
}
