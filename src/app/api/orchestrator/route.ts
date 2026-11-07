import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiText, InvalidAIRequest, readAIJson } from "@/lib/ai/request-validation";
import { orchestrate } from "@/lib/ai/orchestrator";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "La clé API OpenAI est manquante.",
        },
        { status: 500 }
      );
    }

    const body = await readAIJson(request);

    const message = aiText(
      body.message ?? ""
    );

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
        observability:
          orchestrator.observability,
      },
    });
  } catch (error) {
    if (error instanceof InvalidAIRequest) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
