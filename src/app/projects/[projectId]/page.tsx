import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateUserWorkspace } from "@/lib/db/user-workspace";
import { prisma } from "@/lib/db/prisma";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const workspace = await getOrCreateUserWorkspace();

  if (!workspace) {
    redirect("/sign-in");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: workspace.id,
    },
    include: {
      _count: {
        select: {
          conversations: true,
          memories: true,
          files: true,
          agentRuns: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-slate-400 hover:text-white"
        >
          ← Retour au tableau de bord
        </Link>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-sm font-semibold text-blue-400">
            PROJET CREATORBUSINESSAI
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {project.name}
          </h1>

          <p className="mt-4 text-slate-400">
            {project.description ?? "Aucune description."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/ai?projectId=${encodeURIComponent(project.id)}`}
              className="inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Ouvrir AI Central →
            </Link>

            <Link
              href={`/business-builder?projectId=${encodeURIComponent(project.id)}`}
              className="inline-flex rounded-xl border border-blue-400/30 bg-blue-500/10 px-5 py-3 font-semibold text-blue-300 hover:bg-blue-500/20"
            >
              Ouvrir AI Business Builder →
            </Link>

            <Link
              href={`/builder?projectId=${encodeURIComponent(project.id)}`}
              className="inline-flex rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15"
            >
              Ouvrir le Builder →
            </Link>

            <Link
              href={`/builder?projectId=${encodeURIComponent(project.id)}&handoff=analysis`}
              className="inline-flex rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              Construire depuis l’analyse →
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-slate-500">Conversations</p>
              <p className="mt-2 text-2xl font-bold">
                {project._count.conversations}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-slate-500">Mémoires</p>
              <p className="mt-2 text-2xl font-bold">
                {project._count.memories}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-slate-500">Fichiers</p>
              <p className="mt-2 text-2xl font-bold">
                {project._count.files}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-slate-500">Exécutions IA</p>
              <p className="mt-2 text-2xl font-bold">
                {project._count.agentRuns}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
