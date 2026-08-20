"use client";

import { useState } from "react";

export default function BusinessBuilderPage() {
  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("");
  const [market, setMarket] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");

  const scoreMatch = plan.match(/(\d{1,3})\/100/);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;

  const viabilityLabel =
    score === null
      ? null
      : score < 40
        ? "Faible"
        : score < 60
          ? "À valider"
          : score < 80
            ? "Solide"
            : "Excellent";

  const verdictMatch = plan.match(
    /Verdict stratégique[\s\S]*?(GO|À VALIDER|NO-GO)/i
  );
  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : null;

  const cleanedPlan = plan
    .replace(/```(?:markdown)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const sections = cleanedPlan
    ? cleanedPlan
        .split(/(?=^#{1,6}\s)/gm)
        .map((section) => {
          const lines = section.trim().split("\n");

          const title = (lines.shift() || "")
            .replace(/^[\s\u200B-\u200D\uFEFF]*#{1,6}[\s\u00A0]*/, "")
            .replace(/\*\*/g, "")
            .trim();

          const content = lines
            .join("\n")
            .replace(/^#{1,6}\s*/gm, "")
            .replace(/\*\*/g, "")
            .trim();

          return { title, content };
        })
        .filter((section) => section.title && section.content)
    : [];

  const prioritySection = sections.find(
    (section) => section.title.toLowerCase() === "5 actions prioritaires"
  );

  const plan30 = sections.find(
    (section) => section.title.toLowerCase() === "plan 30 jours"
  );

  const plan60 = sections.find(
    (section) => section.title.toLowerCase() === "plan 60 jours"
  );

  const plan90 = sections.find(
    (section) => section.title.toLowerCase() === "plan 90 jours"
  );

  const finalRecommendation = sections.find(
    (section) =>
      section.title.toLowerCase() ===
      "recommandation finale creatorbusinessai"
  );

  const executiveRecommendation =
    finalRecommendation?.content || "";

  async function generatePlan() {
    setLoading(true);
    setError("");
    setPlan("");

    try {
      const response = await fetch("/api/business-builder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea,
          industry,
          market,
          budget,
          goal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur pendant la génération.");
      }

      setPlan(data.plan || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a
              href="/dashboard"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              ← Retour au tableau de bord
            </a>

            <p className="mt-5 text-sm font-bold uppercase tracking-widest text-blue-400">
              CreatorBusinessAI
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              AI Business Builder
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Décrivez votre idée. CreatorBusinessAI préparera progressivement
              votre modèle d'affaires, votre stratégie, votre marché, votre plan
              de revenus et votre plan d'exécution.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Statut
            </p>
            <p className="mt-1 font-semibold text-emerald-400">
              Business Builder prêt
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <div>
              <p className="text-sm font-semibold text-blue-400">
                ÉTAPE 1 — VOTRE PROJET
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Parlez-nous de votre entreprise
              </h2>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Quelle est votre idée ?
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  className="min-h-36 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-blue-400/60"
                  placeholder="Exemple : Je veux lancer une plateforme de services pour les petites entreprises..."
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Secteur d'activité
                  </label>
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none transition focus:border-blue-400/60"
                    placeholder="Ex. Technologie, transport..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Marché cible
                  </label>
                  <input
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none transition focus:border-blue-400/60"
                    placeholder="Ex. Québec, Canada..."
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Budget approximatif
                  </label>
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none transition focus:border-blue-400/60"
                    placeholder="Ex. 10 000 $"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Objectif principal
                  </label>
                  <input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none transition focus:border-blue-400/60"
                    placeholder="Ex. Atteindre 100 clients"
                  />
                </div>
              </div>

              <button
                onClick={generatePlan}
                disabled={loading}
                className="w-full rounded-2xl bg-blue-500 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Génération en cours..." : "Générer mon plan avec l'IA →"}
              </button>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              {plan && (
                <div className="space-y-5">
                  {(score !== null || verdict || executiveRecommendation) && (
                    <section className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                        Résumé décisionnel
                      </p>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[0.7fr_0.7fr_1.6fr]">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Score
                          </p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            {score !== null ? `${score}/100` : "—"}
                          </p>
                          {viabilityLabel && (
                            <p className="mt-1 text-sm font-semibold text-cyan-200">
                              {viabilityLabel}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Verdict
                          </p>
                          <p className="mt-2 text-xl font-bold text-white">
                            {verdict || "Analyse en cours"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Recommandation
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-200">
                            {executiveRecommendation ||
                              "La recommandation finale apparaîtra ici."}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {(score !== null || verdict) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                          Score de viabilité
                        </p>
                        <p className="mt-2 text-4xl font-bold text-white">
                          {score !== null ? `${score}/100` : "—"}
                        </p>

                        {score !== null && (
                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-semibold text-blue-200">
                                {viabilityLabel}
                              </span>
                              <span className="text-slate-400">
                                Viabilité
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-blue-400 transition-all duration-700"
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                          Verdict stratégique
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          {verdict || "Analyse en cours"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <p className="text-sm font-bold text-emerald-300">
                      Plan généré par CreatorBusinessAI
                    </p>

                    {prioritySection && (
                      <section className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                          Priorité d'exécution
                        </p>

                        <h3 className="mt-2 text-2xl font-bold text-white">
                          5 actions prioritaires
                        </h3>

                        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                          {prioritySection.content}
                        </div>
                      </section>
                    )}

                    {(plan30 || plan60 || plan90) && (
                      <div className="grid gap-4 lg:grid-cols-3">
                        {plan30 && (
                          <section className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                              30 jours
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-white">
                              Lancement
                            </h3>
                            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                              {plan30.content}
                            </div>
                          </section>
                        )}

                        {plan60 && (
                          <section className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                              60 jours
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-white">
                              Validation
                            </h3>
                            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                              {plan60.content}
                            </div>
                          </section>
                        )}

                        {plan90 && (
                          <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                              90 jours
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-white">
                              Accélération
                            </h3>
                            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                              {plan90.content}
                            </div>
                          </section>
                        )}
                      </div>
                    )}

                    {sections
                      .filter((section) => {
                        const title = section.title.toLowerCase();

                        return (
                          title !== "5 actions prioritaires" &&
                          title !== "plan 30 jours" &&
                          title !== "plan 60 jours" &&
                          title !== "plan 90 jours" &&
                          title !== "recommandation finale creatorbusinessai"
                        );
                      })
                      .map((section) => (
                        <section
                          key={section.title}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                        >
                          <h3 className="text-lg font-bold text-white">
                            {section.title}
                          </h3>

                          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                            {section.content}
                          </div>
                        </section>
                      ))}

                    {finalRecommendation && (
                      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                          Conclusion stratégique
                        </p>

                        <h3 className="mt-2 text-2xl font-bold text-white">
                          Recommandation finale CreatorBusinessAI
                        </h3>

                        <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-100">
                          {finalRecommendation.content}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-6">
              <p className="text-sm font-bold text-blue-300">
                APERÇU DE VOTRE PROJET
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Idée
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {idea || "Votre idée apparaîtra ici."}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Secteur
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {industry || "Non défini"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Marché
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {market || "Non défini"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Budget
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {budget || "Non défini"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Objectif
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {goal || "Non défini"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-bold">Ce que l'IA préparera</p>

              <div className="mt-5 space-y-3 text-sm text-slate-400">
                <p>✓ Analyse de l'idée et du marché</p>
                <p>✓ Proposition de valeur</p>
                <p>✓ Modèle de revenus</p>
                <p>✓ Positionnement et clientèle cible</p>
                <p>✓ Stratégie marketing</p>
                <p>✓ Plan d'exécution</p>
                <p>✓ Risques et prochaines étapes</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}