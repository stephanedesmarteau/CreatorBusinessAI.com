import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "La clé API OpenAI est manquante." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier audio valide n'a été fourni." },
        { status: 400 }
      );
    }

    const transcription = await client.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
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
