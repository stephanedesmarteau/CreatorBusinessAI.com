import { NextResponse } from "next/server";
import {
  formatRelevantMemories,
  getRelevantMemories,
  persistMemories,
} from "@/lib/ai/memory-engine";

export async function GET() {
  try {
    const memories =
      await getRelevantMemories({
        limit: 30,
      });

    return NextResponse.json({
      success: true,
      memories,
    });
  } catch (error) {
    console.error(
      "Erreur Memory Engine GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer la mémoire intelligente.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const message = String(
      body.message ?? ""
    ).trim();

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Le message est requis.",
        },
        { status: 400 }
      );
    }

    const memories =
      await persistMemories(
        message
      );

    const context =
      await formatRelevantMemories({
        limit: 20,
      });

    return NextResponse.json({
      success: true,
      memories,
      context,
    });
  } catch (error) {
    console.error(
      "Erreur Memory Engine POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de mettre à jour la mémoire intelligente.",
      },
      { status: 500 }
    );
  }
}
