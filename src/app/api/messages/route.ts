import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MessageRole } from "@/generated/prisma/enums";

const allowedRoles = new Set([
  "USER",
  "ASSISTANT",
  "SYSTEM",
  "TOOL",
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId =
      searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId est requis." },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Erreur Messages GET:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les messages." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const conversationId =
      String(body.conversationId ?? "").trim();

    const content =
      String(body.content ?? "").trim();

    const rawRole =
      String(body.role ?? "USER").toUpperCase();

    if (!conversationId || !content) {
      return NextResponse.json(
        {
          error:
            "conversationId et content sont requis.",
        },
        { status: 400 }
      );
    }

    if (!allowedRoles.has(rawRole)) {
      return NextResponse.json(
        { error: "Rôle de message invalide." },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        role: rawRole as MessageRole,
        content,
        model:
          String(body.model ?? "").trim() || null,
        route:
          String(body.route ?? "").trim() || null,
        metadata: body.metadata ?? undefined,
      },
    });

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Erreur Messages POST:", error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer le message." },
      { status: 500 }
    );
  }
}
