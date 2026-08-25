import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AgentRunStatus } from "@/generated/prisma/enums";
import { getOrCreateDefaultWorkspace } from "@/lib/db/default-workspace";

const allowedStatuses = new Set([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    let workspaceId =
      searchParams.get("workspaceId");

    const projectId =
      searchParams.get("projectId");

    if (!workspaceId) {
      const workspace =
        await getOrCreateDefaultWorkspace();

      workspaceId = workspace.id;
    }

    const agentRuns = await prisma.agentRun.findMany({
      where: {
        workspaceId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      agentRuns,
    });
  } catch (error) {
    console.error("Erreur AgentRuns GET:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les exécutions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let workspaceId =
      String(body.workspaceId ?? "").trim();

    if (!workspaceId) {
      const workspace =
        await getOrCreateDefaultWorkspace();

      workspaceId = workspace.id;
    }

    const agent =
      String(body.agent ?? "").trim();

    if (!agent) {
      return NextResponse.json(
        { error: "Le nom de l'agent est requis." },
        { status: 400 }
      );
    }

    const rawStatus =
      String(body.status ?? "PENDING").toUpperCase();

    if (!allowedStatuses.has(rawStatus)) {
      return NextResponse.json(
        { error: "Statut d'exécution invalide." },
        { status: 400 }
      );
    }

    const rawDuration =
      Number(body.durationMs);

    const durationMs =
      Number.isFinite(rawDuration) && rawDuration >= 0
        ? Math.round(rawDuration)
        : null;

    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId,
        projectId:
          String(body.projectId ?? "").trim() || null,
        agent,
        objective:
          String(body.objective ?? "").trim() || null,
        input: body.input ?? undefined,
        output: body.output ?? undefined,
        status: rawStatus as AgentRunStatus,
        model:
          String(body.model ?? "").trim() || null,
        durationMs,
        error:
          String(body.error ?? "").trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      agentRun,
    });
  } catch (error) {
    console.error("Erreur AgentRuns POST:", error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer l'exécution." },
      { status: 500 }
    );
  }
}
