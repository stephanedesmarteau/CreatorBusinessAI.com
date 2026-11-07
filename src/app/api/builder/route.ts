import { NextResponse } from "next/server";
import { buildProject } from "@/lib/ai/builder-engine";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";

export const maxDuration = 300;

const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get("origin") ?? "";

  const isAllowedLocalOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

  const configuredOrigin =
    process.env.NEXT_PUBLIC_CREATORBUSINESSAI_ORIGIN ?? "";

  const allowed =
    isAllowedLocalOrigin ||
    (configuredOrigin && origin === configuredOrigin);

  return allowed
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
      }
    : {};
};

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

const jsonWithCors = (
  request: Request,
  body: unknown,
  init: ResponseInit = {}
) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers).entries()),
      ...corsHeaders(request),
    },
  });

export async function POST(
  request: Request
) {
  try {
    const workspace = await getOrCreateUserWorkspace();
    if (!workspace) return jsonWithCors(request, { error: "Non autorisé." }, { status: 401 });

    const body =
      await request.json();

    const prompt =
      String(
        body.prompt ??
          body.message ??
          ""
      ).trim();

    if (!prompt) {
      return jsonWithCors(request,
        {
          error:
            "Veuillez décrire le projet à créer.",
        },
        { status: 400 }
      );
    }

    const requestedProjectId = String(body.projectId ?? "").trim();

    const existingProject = requestedProjectId
      ? await prisma.project.findFirst({
          where: {
            id: requestedProjectId,
            workspaceId: workspace.id,
          },
        })
      : null;

    if (requestedProjectId && !existingProject) {
      return jsonWithCors(request, { error: "Projet introuvable ou accès interdit." }, { status: 403 });
    }

    const built = await buildProject(prompt);
    const project = existingProject ?? await prisma.project.create({
          data: {
            workspaceId: workspace.id,
            name: built.name,
            description: built.description || null,
          },
        });

    if (!project) return jsonWithCors(request, { error: "Projet introuvable ou accès interdit." }, { status: 403 });

    await prisma.$transaction([
      prisma.fileAsset.deleteMany({
        where: {
          workspaceId: workspace.id,
          projectId: project.id,
          metadata: {
            path: ["kind"],
            equals: "generated-source",
          },
        },
      }),
      prisma.fileAsset.createMany({
        data: built.files.map(
          (file) => ({
            workspaceId:
              workspace.id,
            projectId:
              project.id,
            name: file.path,
            mimeType:
              "text/plain",
            status: "READY",
            metadata: {
              kind: "generated-source",
              path: file.path,
              content: file.content,
              stack: built.stack,
            },
          })
        ),
      }),
    ]);

    return jsonWithCors(request, {
      success: true,
      route: "builder",
      project: {
        id: project.id,
        name: project.name,
        description:
          project.description,
        stack: built.stack,
        files: built.files,
      },
    });
  } catch (error) {
    console.error(
      "Erreur Builder:",
      error
    );

    return jsonWithCors(request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de générer le projet.",
      },
      { status: 500 }
    );
  }
}
