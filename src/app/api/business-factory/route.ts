import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import {
  buildBusinessFactorySpec,
  type BusinessFactoryInput,
} from "@/lib/ai/business-factory";

export const maxDuration = 300;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const workspace = await getOrCreateUserWorkspace();

    if (!workspace) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const projectId = clean(body.projectId) || null;

    let projectName = clean(body.projectName);
    let idea = clean(body.idea);
    let industry = clean(body.industry);
    let targetMarket = clean(body.targetMarket);
    let budget = clean(body.budget);
    let mainGoal = clean(body.mainGoal);
    const language = clean(body.language) || "fr";

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId: workspace.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

      if (!project) {
        return NextResponse.json(
          {
            error:
              "Projet introuvable ou accès interdit.",
          },
          { status: 403 }
        );
      }

      projectName ||= project.name;
      idea ||= project.description || "";

      const latestAnalysis =
        await prisma.projectAnalysis.findFirst({
          where: {
            workspaceId: workspace.id,
            projectId: project.id,
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

      if (latestAnalysis) {
        projectName ||= latestAnalysis.projectName;
        idea ||= latestAnalysis.description;
        industry ||= latestAnalysis.sector;
        targetMarket ||= latestAnalysis.targetMarket;
        mainGoal ||= latestAnalysis.mainGoal;
      }
    }

    if (!projectName) {
      projectName =
        industry ||
        idea.slice(0, 80) ||
        "Nouveau projet";
    }

    if (!idea) {
      return NextResponse.json(
        {
          error:
            "Une description ou une idée d'entreprise est requise.",
        },
        { status: 400 }
      );
    }

    const input: BusinessFactoryInput = {
      projectId,
      projectName,
      idea,
      industry,
      targetMarket,
      budget,
      mainGoal,
      language,
    };

    const factory =
      await buildBusinessFactorySpec(input);

    return NextResponse.json({
      success: true,
      factory,
      context: {
        workspaceId: workspace.id,
        projectId,
        persisted: false,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Business Factory:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de générer la Business Factory.",
      },
      { status: 500 }
    );
  }
}
