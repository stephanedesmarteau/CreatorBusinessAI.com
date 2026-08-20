"use client";

import { useState } from "react";

export default function AICentralPage() {
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function routeRequest() {
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setRoute("");
    setResult("");

    try {
      const response = await fetch("/api/ai-router", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur du AI Router.");
      }

      setRoute(data.route || "general");
      setResult(data.result || "");
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
      <div className="mx-auto max-w-5xl px-6 py-12">
        <a
          href="/dashboard"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          ← Retour au tableau de bord
        </a>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-400">
            CreatorBusinessAI
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            AI Central
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Décrivez simplement ce que vous voulez créer, analyser,
            rechercher ou automatiser. CreatorBusinessAI choisira
            automatiquement le moteur adapté.
          </p>

          <div className="mt-8">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Exemple : Crée-moi une application mobile de réservation..."
              className="min-h-44 w-full rounded-2xl border border-white/10 bg-black/20 p-5 text-white outline-none transition focus:border-blue-400/60"
            />

            <button
              onClick={routeRequest}
              disabled={loading || !message.trim()}
              className="mt-4 w-full rounded-2xl bg-blue-500 px-6 py-4 font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Analyse de la demande..."
                : "Lancer CreatorBusinessAI →"}
            </button>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          {route && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Route sélectionnée
              </p>

              <p className="mt-2 text-2xl font-bold capitalize text-white">
                {route}
              </p>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
                Réponse de l'agent
              </p>

              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
