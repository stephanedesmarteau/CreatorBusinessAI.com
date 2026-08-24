import { NextResponse } from "next/server";
import { researchWeb } from "@/lib/ai/research-engine";

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const query = String(
      body.query ?? body.message ?? ""
    ).trim();

    if (!query) {
      return NextResponse.json(
        {
          error:
            "Veuillez fournir une demande de recherche.",
        },
        { status: 400 }
      );
    }

    const research = await researchWeb(query);

    return NextResponse.json({
      success: true,
      route: "research",
      result: research.text,
      sources: research.sources,
    });
  } catch (error) {
    console.error(
      "Erreur Research Web:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'effectuer la recherche Web.",
      },
      { status: 500 }
    );
  }
}
