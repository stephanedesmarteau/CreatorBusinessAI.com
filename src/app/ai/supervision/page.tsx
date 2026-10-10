import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db/prisma";

export default async function AISupervisionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }


  const runs = await prisma.agentRun.findMany({
    where: {
      workspace: {
        ownerId: user.id,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      agent: true,
      status: true,
      model: true,
      output: true,
      createdAt: true,
    },
  });

  const completed = runs.filter(
    (run) => run.status === "COMPLETED"
  ).length;

  const failed = runs.filter(
    (run) => run.status === "FAILED"
  ).length;

  const usageRecords = runs
    .map((run) => {
      const output = run.output;

      if (
        !output ||
        typeof output !== "object" ||
        Array.isArray(output)
      ) {
        return null;
      }

      const trace = output.modelTrace;

      if (
        !trace ||
        typeof trace !== "object" ||
        Array.isArray(trace)
      ) {
        return null;
      }

      const usage = trace.usage;

      if (
        !usage ||
        typeof usage !== "object" ||
        Array.isArray(usage)
      ) {
        return null;
      }

      const input = usage.inputTokens;
      const outputTokens = usage.outputTokens;

      if (
        typeof input !== "number" ||
        !Number.isSafeInteger(input) ||
        input < 0 ||
        typeof outputTokens !== "number" ||
        !Number.isSafeInteger(outputTokens) ||
        outputTokens < 0
      ) {
        return null;
      }

      return {
        input,
        output: outputTokens,
      };
    })
    .filter((usage) => usage !== null);

  const totalInputTokens = usageRecords.reduce(
    (sum, usage) => sum + usage.input,
    0
  );

  const totalOutputTokens = usageRecords.reduce(
    (sum, usage) => sum + usage.output,
    0
  );

  const totalTokens =
    totalInputTokens + totalOutputTokens;

  const tokensDisplay =
    usageRecords.length > 0
      ? totalTokens.toLocaleString("fr-CA")
      : "En attente de données";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Retour au tableau de bord
        </Link>

        <div className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            CreatorBusinessAI · Super AI Engine
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Centre de supervision IA
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Suivi des modèles, des exécutions, de la consommation
            de jetons et des coûts estimés.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Exécutions IA (100 dernières max.)", String(runs.length)],
            ["Jetons consommés", tokensDisplay],
            ["Coûts estimés", "Tarifs à vérifier"],
          ].map(([title, value]) => (
            <section
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm text-slate-400">
                {title}
              </p>
              <p className="mt-3 text-lg font-semibold">
                {value}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            [
              "Jetons d'entrée",
              usageRecords.length > 0
                ? totalInputTokens.toLocaleString("fr-CA")
                : "En attente de données",
            ],
            [
              "Jetons de sortie",
              usageRecords.length > 0
                ? totalOutputTokens.toLocaleString("fr-CA")
                : "En attente de données",
            ],
          ].map(([title, value]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm text-slate-400">{title}</p>
              <p className="mt-3 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">
            Historique des exécutions
          </h2>

          <p className="mt-4 text-slate-400">
            {completed} réussie(s) · {failed} échouée(s)
            parmi les {runs.length} dernières exécutions.
          </p>

          {runs.length === 0 ? (
            <p className="mt-6 text-slate-400">
              Aucune exécution enregistrée.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <p className="font-semibold">{run.agent}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {run.status} · {run.model || "Modèle non enregistré"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {run.createdAt.toISOString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
