import { NextResponse } from "next/server";
import {
  generateVoice,
  type VoiceName,
} from "@/lib/ai/voice-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const text = String(body.text ?? "").trim();
    const voiceName = String(body.voiceName ?? "cedar") as VoiceName;

    if (!text) {
      return NextResponse.json(
        { error: "Le texte à lire est vide." },
        { status: 400 }
      );
    }

    const audio = await generateVoice(
      text,
      voiceName
    );

    return NextResponse.json({
      success: true,
      audio,
    });
  } catch (error) {
    console.error("Erreur Speak:", error);

    return NextResponse.json(
      {
        error: "Impossible de générer la réponse vocale.",
      },
      { status: 500 }
    );
  }
}
