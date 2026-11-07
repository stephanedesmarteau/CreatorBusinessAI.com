import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiText, InvalidAIRequest, readAIJson } from "@/lib/ai/request-validation";
import { researchWeb } from "@/lib/ai/research-engine";

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const body = await readAIJson(request);

    const query = aiText(
      body.query ?? body.message ?? ""
    );

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
    if (error instanceof InvalidAIRequest) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
