"use client";

import { useEffect, useRef, useState } from "react";
import { canonicalizeBusinessFactory } from "@/lib/business-factory-canonical";

type FactoryExecutionResult = {
  type: string;
  title: string;
  status: "completed" | "failed";
  mission: string;
  output: string;
  error?: string;
  orchestrator?: {
    observability?: {
      totalSteps?: number;
      completedSteps?: number;
      failedSteps?: number;
      modelCalls?: number;
      fallbackCount?: number;
      modelsUsed?: string[];
    };
  };
};

type FactoryExecution = {
  projectName: string;
  status: "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string;
  totalDeliverables: number;
  completedDeliverables: number;
  failedDeliverables: number;
  results: FactoryExecutionResult[];
};


function FormattedContent({
  content,
}: {
  content: string;
}) {
  const normalized = content
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\\-/g, "-")
    .replace(/\\(\d+)\./g, "$1.")
    .replace(/\s+(?=\d+[.)]\s)/g, "\n")
    .replace(/\s+-\s+(?=[A-ZÀ-ÖØ-ÞÉÈÊËÎÏÔÖÙÛÜÇ])/g, "\n- ")
    .trim();

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const bulletMatch =
          line.match(/^[-•]\s*(.+)$/);

        const numberedMatch =
          line.match(/^(\d+)[.)]\s*(.+)$/);

        if (numberedMatch) {
          return (
            <div
              key={`${line}-${index}`}
              className="flex gap-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                {numberedMatch[1]}
              </div>

              <p className="pt-0.5 text-sm leading-7 text-slate-200">
                {numberedMatch[2]}
              </p>
            </div>
          );
        }

        if (bulletMatch) {
          return (
            <div
              key={`${line}-${index}`}
              className="flex gap-3"
            >
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />

              <p className="text-sm leading-7 text-slate-200">
                {bulletMatch[1]}
              </p>
            </div>
          );
        }

        return (
          <p
            key={`${line}-${index}`}
            className="text-sm leading-7 text-slate-300"
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

async function getBusinessFactoryIdempotencyKey(
  factory: unknown
): Promise<string> {
  const serialized = canonicalizeBusinessFactory(factory);

  if (!serialized) {
    throw new Error("Plan Business Factory invalide.");
  }

  const bytes = new TextEncoder().encode(serialized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  const fingerprint = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const storageKey =
    "creatorbusinessai:business-factory-build:" + fingerprint;

  const existing = localStorage.getItem(storageKey);

  if (existing && /^[a-zA-Z0-9_-]{16,128}$/.test(existing)) {
    return existing;
  }

  const idempotencyKey = crypto.randomUUID();

  localStorage.setItem(storageKey, idempotencyKey);

  return idempotencyKey;
}

function getBusinessBuilderDraftKey(): string {
  const projectId =
    new URLSearchParams(window.location.search)
      .get("projectId")
      ?.trim();

  return projectId
    ? `creatorbusinessai:business-builder-draft:${projectId}`
    : "creatorbusinessai:business-builder-draft";
}

export default function BusinessBuilderPage() {
  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("");
  const [market, setMarket] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");
  const [factory, setFactory] = useState<unknown>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [executingFactory, setExecutingFactory] = useState(false);
  const [factoryExecution, setFactoryExecution] =
    useState<FactoryExecution | null>(null);
  const [factoryExecutionError, setFactoryExecutionError] =
    useState("");
  const factoryExecutionLockRef = useRef(false);
  const buildLockRef = useRef(false);
  const planGenerationStartedRef = useRef(false);
  const formEditedDuringRestoreRef = useRef(false);

  const [draftReady, setDraftReady] = useState(false);

  function markFormEdited() {
    formEditedDuringRestoreRef.current = true;
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(
        getBusinessBuilderDraftKey()
      );

      if (!raw) return;

      const saved = JSON.parse(raw);

      if (!saved || typeof saved !== "object") return;

      setIdea(String(saved.idea ?? ""));
      setIndustry(String(saved.industry ?? ""));
      setMarket(String(saved.market ?? ""));
      setBudget(String(saved.budget ?? ""));
      setGoal(String(saved.goal ?? ""));
    } catch {
      console.warn("Brouillon Business Builder non restauré.");
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    try {
      localStorage.setItem(
      getBusinessBuilderDraftKey(),
      JSON.stringify({ idea, industry, market, budget, goal })
      );
    } catch {
      console.warn("Impossible de sauvegarder le brouillon.");
    }
  }, [draftReady, idea, industry, market, budget, goal]);


  async function saveBusinessFactoryAnalysis(
    generatedFactory: Record<string, unknown>,
    generatedPlan: string
  ) {
    const projectId =
      new URLSearchParams(window.location.search)
        .get("projectId")
        ?.trim() || null;

    const localId = `business-factory-${crypto.randomUUID()}`;

    const response = await fetch("/api/project-analyses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        localId,
        projectId,
        projectName: idea.trim().slice(0, 120) || "Projet Business Factory",
        description: idea,
        sector: industry,
        targetMarket: market,
        mainGoal: goal,
        result: {
          source: "business-factory",
          idea,
          industry,
          market,
          budget,
          goal,
          plan: generatedPlan,
          factory: generatedFactory,
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.error || "Sauvegarde PostgreSQL impossible."
      );
    }

    return response.json();
  }

  useEffect(() => {
    const projectId =
      new URLSearchParams(window.location.search)
        .get("projectId")
        ?.trim();

    if (!projectId) return;

    let cancelled = false;

    async function restoreBusinessFactoryAnalysis() {
      try {
        const response = await fetch(
          `/api/project-analyses?projectId=${encodeURIComponent(projectId!)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Impossible de récupérer les analyses.");
        }

        const data = await response.json();

        if (
          cancelled ||
          planGenerationStartedRef.current ||
          formEditedDuringRestoreRef.current ||
          !Array.isArray(data.analyses)
        ) return;

        const analysis = data.analyses.find(
          (item: { result?: { source?: string; plan?: string; factory?: unknown } }) =>
            item.result?.source === "business-factory" &&
            typeof item.result.plan === "string" &&
            item.result.factory
        );

        if (!analysis) return;

        const savedResult = analysis.result as {
          plan: string;
          factory: unknown;
          idea?: string;
          industry?: string;
          market?: string;
          budget?: string;
          goal?: string;
        };

        setPlan(savedResult.plan);
        setFactory(savedResult.factory);

        if (
          typeof savedResult.idea === "string" &&
          typeof savedResult.industry === "string" &&
          typeof savedResult.market === "string" &&
          typeof savedResult.budget === "string" &&
          typeof savedResult.goal === "string"
        ) {
          setIdea(savedResult.idea);
          setIndustry(savedResult.industry);
          setMarket(savedResult.market);
          setBudget(savedResult.budget);
          setGoal(savedResult.goal);
        }
      } catch (restoreError) {
        console.error(
          "[CreatorBusinessAI] Restauration du plan impossible.",
          restoreError
        );
      }
    }

    void restoreBusinessFactoryAnalysis();

    return () => {
      cancelled = true;
    };
  }, []);

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
    (section) =>
      section.title.toLowerCase().includes(
        "actions prioritaires"
      )
  );

  const plan30 = sections.find((section) => {
    const title = section.title.toLowerCase();

    return (
      title === "plan 30 jours" ||
      title === "30 jours"
    );
  });

  const plan60 = sections.find((section) => {
    const title = section.title.toLowerCase();

    return (
      title === "plan 60 jours" ||
      title === "60 jours"
    );
  });

  const plan90 = sections.find((section) => {
    const title = section.title.toLowerCase();

    return (
      title === "plan 90 jours" ||
      title === "90 jours"
    );
  });

  const finalRecommendation = sections.find(
    (section) =>
      section.title.toLowerCase() ===
      "recommandation finale creatorbusinessai"
  );

  const executiveRecommendation =
    finalRecommendation?.content || "";

  function downloadPlan() {
    if (!plan) return;

    const content = [
      "CreatorBusinessAI",
      "AI Business Builder",
      "",
      `Score de viabilité: ${score !== null ? `${score}/100` : "Non disponible"}`,
      `Verdict stratégique: ${verdict || "Non disponible"}`,
      "",
      cleanedPlan,
    ].join("\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "CreatorBusinessAI-plan-affaires.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function executeFactory() {
    if (
      !factory ||
      executingFactory ||
      factoryExecutionLockRef.current
    ) {
      return;
    }

    factoryExecutionLockRef.current = true;
    setExecutingFactory(true);
    setFactoryExecutionError("");
    setFactoryExecution(null);

    try {
      const response = await fetch(
        "/api/business-factory/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            factory,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'exécuter la Business Factory."
        );
      }

      if (!data.execution) {
        throw new Error(
          "La Business Factory n'a retourné aucune exécution."
        );
      }

      setFactoryExecution(
        data.execution as FactoryExecution
      );
    } catch (executionFailure) {
      setFactoryExecutionError(
        executionFailure instanceof Error
          ? executionFailure.message
          : "Impossible d'exécuter la Business Factory."
      );
    } finally {
      factoryExecutionLockRef.current = false;
      setExecutingFactory(false);
    }
  }

  async function buildFromFactory() {
    if (!factory || building || buildLockRef.current) {
      return;
    }

    buildLockRef.current = true;
    setBuilding(true);
    setBuildError("");

    try {
      const idempotencyKey =
        await getBusinessFactoryIdempotencyKey(factory);

      const response = await fetch(
        "/api/business-factory/build",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            factory,
            idempotencyKey,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de construire le projet."
        );
      }

      const newProjectId =
        String(data.project?.id ?? "").trim();

      if (!newProjectId) {
        throw new Error(
          "Le Builder n'a retourné aucun projet."
        );
      }

      window.location.href =
        `/builder?projectId=${encodeURIComponent(
          newProjectId
        )}`;
    } catch (buildFailure) {
      setBuildError(
        buildFailure instanceof Error
          ? buildFailure.message
          : "Impossible de construire le projet."
      );
    } finally {
      buildLockRef.current = false;
      setBuilding(false);
    }
  }

  async function generatePlan() {
    planGenerationStartedRef.current = true;
    setLoading(true);
    setError("");
    setPlan("");
    setFactory(null);
    setBuildError("");
    setFactoryExecution(null);
    setFactoryExecutionError("");

    try {
      const response = await fetch("/api/business-factory", {
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

      const factory = data.factory;

      if (!factory) {
        throw new Error(
          "La Business Factory n'a retourné aucun résultat."
        );
      }

      setFactory(factory);

      const list = (items: unknown) =>
        Array.isArray(items)
          ? items.map((item) => `- ${String(item)}`).join("\n")
          : "";

      const priorities = Array.isArray(
        factory.execution?.priorities
      )
        ? factory.execution.priorities
            .map(
              (
                item: {
                  title?: string;
                  description?: string;
                  timeframe?: string;
                },
                index: number
              ) =>
                `${index + 1}. ${item.title || "Action"} — ${
                  item.description || ""
                } ${
                  item.timeframe
                    ? `(${item.timeframe})`
                    : ""
                }`
            )
            .join("\n")
        : "";

      const factoryPlan = [
        "# Résumé exécutif",
        factory.strategy?.executiveSummary || "",
        "",
        "# Problème client à résoudre",
        factory.strategy?.problem || "",
        "",
        "# Clientèle cible",
        factory.strategy?.targetAudience || "",
        "",
        "# Proposition de valeur",
        factory.strategy?.valueProposition || "",
        "",
        "# Positionnement",
        factory.strategy?.positioning || "",
        "",
        "# Avantage concurrentiel",
        factory.strategy?.competitiveAdvantage || "",
        "",
        "# Analyse du marché",
        factory.market?.opportunity || "",
        "",
        "# Analyse de la concurrence",
        list(factory.market?.competitors),
        "",
        "# Hypothèses à valider",
        list(factory.market?.assumptions),
        "",
        "# Plan de validation",
        list(factory.market?.validationPlan),
        "",
        "# Modèle de revenus",
        factory.businessModel?.revenueModel || "",
        "",
        "# Tarification",
        factory.businessModel?.pricing || "",
        "",
        "# Acquisition",
        factory.businessModel?.acquisition || "",
        "",
        "# Ventes",
        factory.businessModel?.sales || "",
        "",
        "# Stratégie marketing",
        factory.marketing?.message || "",
        list(factory.marketing?.channels),
        "",
        "# Plan de contenu",
        list(factory.marketing?.contentPlan),
        "",
        "# SEO",
        list(factory.marketing?.seoPlan),
        "",
        "# Budget recommandé",
        factory.finance?.recommendedBudget || "",
        "",
        "# Besoins financiers",
        factory.finance?.fundingNeeds || "",
        "",
        "# KPIs à suivre",
        list(factory.finance?.kpis),
        "",
        "# Plan 30 jours",
        list(factory.execution?.days30),
        "",
        "# Plan 60 jours",
        list(factory.execution?.days60),
        "",
        "# Plan 90 jours",
        list(factory.execution?.days90),
        "",
        "# 5 actions prioritaires",
        priorities,
        "",
        "# Principaux risques",
        list(factory.execution?.risks),
        "",
        "# Produit numérique recommandé",
        factory.digital?.recommendedProduct || "",
        "",
        "# Fonctionnalités principales",
        list(factory.digital?.coreFeatures),
        "",
        "# Intégrations",
        list(factory.digital?.integrations),
        "",
        "# Automatisations",
        list(factory.digital?.automationOpportunities),
      ]
        .filter(
          (value) =>
            typeof value === "string"
        )
        .join("\n");

      setPlan(factoryPlan);

      try {
        await saveBusinessFactoryAnalysis(
          factory as Record<string, unknown>,
          factoryPlan
        );
        console.info(
          "[CreatorBusinessAI] Plan Business Factory sauvegardé."
        );
      } catch (saveError) {
        console.error(
          "[CreatorBusinessAI] Sauvegarde du plan échouée.",
          saveError
        );
        setError(
          "Le plan a été généré, mais sa sauvegarde permanente a échoué. " +
          "Téléchargez le plan avant de quitter cette page."
        );
      }
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
                  onChange={(e) => { markFormEdited(); setIdea(e.target.value); }}
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
                    onChange={(e) => { markFormEdited(); setIndustry(e.target.value); }}
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
                    onChange={(e) => { markFormEdited(); setMarket(e.target.value); }}
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
                    onChange={(e) => { markFormEdited(); setBudget(e.target.value); }}
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
                    onChange={(e) => { markFormEdited(); setGoal(e.target.value); }}
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

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={downloadPlan}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.10]"
                    >
                      Télécharger le plan
                    </button>

                    <button
                      type="button"
                      onClick={() => void executeFactory()}
                      disabled={!factory || executingFactory}
                      className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {executingFactory
                        ? "Business Factory en exécution..."
                        : "Exécuter la Business Factory →"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void buildFromFactory()}
                      disabled={!factory || building}
                      className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {building
                        ? "Construction en cours..."
                        : "Construire avec CreatorBusinessAI →"}
                    </button>
                  </div>

                  {factoryExecutionError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                      {factoryExecutionError}
                    </div>
                  )}

                  {executingFactory && (
                    <section className="rounded-3xl border border-violet-400/30 bg-violet-500/10 p-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                        Business Factory Control Center
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-white">
                        Les équipes IA travaillent sur votre entreprise
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        CreatorBusinessAI répartit actuellement les livrables
                        entre ses planners, agents spécialisés et moteurs de
                        synthèse. Cette opération peut prendre plusieurs minutes.
                      </p>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-violet-400" />
                      </div>
                    </section>
                  )}

                  {factoryExecution && (
                    <section className="space-y-5 rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.07] p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                            Business Factory Control Center
                          </p>

                          <h3 className="mt-2 text-2xl font-bold text-white">
                            Exécution multi-agents terminée
                          </h3>

                          <p className="mt-2 text-sm text-slate-400">
                            {factoryExecution.projectName}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Statut
                          </p>
                          <p className="mt-1 font-bold text-emerald-300">
                            {factoryExecution.status}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Livrables
                          </p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            {factoryExecution.totalDeliverables}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                          <p className="text-xs uppercase tracking-wider text-emerald-300">
                            Réussis
                          </p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            {factoryExecution.completedDeliverables}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                          <p className="text-xs uppercase tracking-wider text-red-300">
                            Échoués
                          </p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            {factoryExecution.failedDeliverables}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {factoryExecution.results.map(
                          (result, index) => {
                            const observability =
                              result.orchestrator?.observability;

                            return (
                              <details
                                key={`${result.type}-${index}`}
                                className="group rounded-2xl border border-white/10 bg-black/20"
                              >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                                      {result.type}
                                    </p>
                                    <h4 className="mt-1 font-bold text-white">
                                      {result.title}
                                    </h4>
                                  </div>

                                  <span
                                    className={
                                      result.status === "completed"
                                        ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300"
                                        : "rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300"
                                    }
                                  >
                                    {result.status === "completed"
                                      ? "Terminé"
                                      : "Échec"}
                                  </span>
                                </summary>

                                <div className="border-t border-white/10 p-5">
                                  {observability && (
                                    <div className="mb-5 grid gap-3 text-xs sm:grid-cols-4">
                                      <div className="rounded-xl bg-white/[0.04] p-3">
                                        <p className="text-slate-500">
                                          Étapes
                                        </p>
                                        <p className="mt-1 font-bold text-white">
                                          {observability.totalSteps ?? 0}
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-white/[0.04] p-3">
                                        <p className="text-slate-500">
                                          Appels IA
                                        </p>
                                        <p className="mt-1 font-bold text-white">
                                          {observability.modelCalls ?? 0}
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-white/[0.04] p-3">
                                        <p className="text-slate-500">
                                          Fallbacks
                                        </p>
                                        <p className="mt-1 font-bold text-white">
                                          {observability.fallbackCount ?? 0}
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-white/[0.04] p-3">
                                        <p className="text-slate-500">
                                          Modèles
                                        </p>
                                        <p className="mt-1 break-words font-bold text-white">
                                          {observability.modelsUsed?.join(
                                            ", "
                                          ) || "—"}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {result.error && (
                                    <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                                      {result.error}
                                    </div>
                                  )}

                                  {result.output ? (
                                    <FormattedContent
                                      content={result.output}
                                    />
                                  ) : (
                                    <p className="text-sm text-slate-500">
                                      Aucun résultat disponible.
                                    </p>
                                  )}
                                </div>
                              </details>
                            );
                          }
                        )}
                      </div>
                    </section>
                  )}

                  {buildError && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                      {buildError}
                    </div>
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

                        <div className="mt-4">
                          <FormattedContent
                            content={prioritySection.content}
                          />
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
                            <div className="mt-3">
                              <FormattedContent
                                content={plan30.content}
                              />
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
                            <div className="mt-3">
                              <FormattedContent
                                content={plan60.content}
                              />
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
                            <div className="mt-3">
                              <FormattedContent
                                content={plan90.content}
                              />
                            </div>
                          </section>
                        )}
                      </div>
                    )}

                    {sections
                      .filter((section) => {
                        const title = section.title.toLowerCase();

                        return (
                          !title.includes("actions prioritaires") &&
                          title !== "plan 30 jours" &&
                          title !== "30 jours" &&
                          title !== "plan 60 jours" &&
                          title !== "60 jours" &&
                          title !== "plan 90 jours" &&
                          title !== "90 jours" &&
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

                          <div className="mt-4">
                            <FormattedContent
                              content={section.content}
                            />
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

                        <div className="mt-4">
                          <FormattedContent
                            content={finalRecommendation.content}
                          />
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