"use client";

import { useState } from "react";

export default function AICentralPage() {
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState("");
  const [result, setResult] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageType, setImageType] = useState("");
  const [imageMimeType, setImageMimeType] = useState("image/png");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageQuality, setImageQuality] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function downloadImage() {
    if (!imageData) return;

    const link = document.createElement("a");

    link.href =
      imageType === "base64"
        ? `data:${imageMimeType};base64,${imageData}`
        : imageData;

    link.download = "CreatorBusinessAI-image.png";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function routeRequest() {
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setRoute("");
    setResult("");
    setImageData("");
    setImageType("");
    setImageMimeType("image/png");

    try {
      const response = await fetch("/api/ai-router", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          imageSize,
          imageQuality,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur du AI Router.");
      }

      setRoute(data.route || "general");
      setResult(data.result || "");

      if (data.image?.data) {
        setImageData(data.image.data);
        setImageType(data.image.type || "");
        setImageMimeType(data.image.mimeType || "image/png");
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
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Carré", value: "1024x1024" },
                { label: "Paysage", value: "1536x1024" },
                { label: "Portrait", value: "1024x1536" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setImageSize(option.value)}
                  className={
                    imageSize === option.value
                      ? "rounded-2xl border border-blue-400/40 bg-blue-500/20 px-4 py-3 text-sm font-bold text-blue-200"
                      : "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Qualité
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Rapide", value: "low" },
                  { label: "Standard", value: "medium" },
                  { label: "Haute qualité", value: "high" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setImageQuality(option.value)}
                    className={
                      imageQuality === option.value
                        ? "rounded-2xl border border-violet-400/40 bg-violet-500/20 px-4 py-3 text-sm font-bold text-violet-200"
                        : "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

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

          {imageData && (
            <div className="mt-6 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                Image générée
              </p>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <img
                  src={
                    imageType === "base64"
                      ? `data:${imageMimeType};base64,${imageData}`
                      : imageData
                  }
                  alt="Image générée par CreatorBusinessAI"
                  className="h-auto w-full object-contain"
                />
              </div>

              <button
                onClick={downloadImage}
                className="mt-4 w-full rounded-2xl bg-violet-500 px-5 py-3 font-bold text-white transition hover:bg-violet-400"
              >
                Télécharger l'image
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
