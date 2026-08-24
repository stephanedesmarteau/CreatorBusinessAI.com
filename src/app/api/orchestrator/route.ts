import { NextResponse } from "next/server";
import { orchestrate } from "@/lib/ai/orchestrator";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "La clé API OpenAI est manquante.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const message = String(
      body.message ?? ""
    ).trim();

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Veuillez fournir une mission.",
        },
        { status: 400 }
      );
    }

    const orchestrator =
      await orchestrate(message);

    return NextResponse.json({
      success: true,
      route: "orchestrator",
      message,
      result: orchestrator.result,
      orchestrator: {
        strategy:
          orchestrator.plan.strategy,
        plan: orchestrator.plan.steps,
        steps: orchestrator.steps,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Super Orchestrator:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue dans le Super Orchestrator.",
      },
      { status: 500 }
    );
  }
}
