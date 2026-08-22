"use client";

import { useEffect, useState } from "react";

export default function AICentralPage() {
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState("");
  const [result, setResult] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageType, setImageType] = useState("");
  const [imageMimeType, setImageMimeType] = useState("image/png");
  const [videoId, setVideoId] = useState("");
  const [videoStatus, setVideoStatus] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSize, setVideoSize] = useState("1280x720");
  const [videoSeconds, setVideoSeconds] = useState("8");
  const [videoModel, setVideoModel] = useState("sora-2");
  const [audioData, setAudioData] = useState("");
  const [audioMimeType, setAudioMimeType] = useState("audio/mpeg");
  const [voiceName, setVoiceName] = useState("cedar");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageQuality, setImageQuality] = useState("medium");
  const [editMode, setEditMode] = useState<"full" | "mask">("full");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState("");
  const [imageHistory, setImageHistory] = useState<
    { id: string; src: string; label: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!videoId) return;

    if (
      videoStatus === "completed" ||
      videoStatus === "failed"
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const checkVideoStatus = async () => {
      try {
        const response = await fetch(
          `/api/video-status?id=${encodeURIComponent(videoId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Impossible de suivre la vidéo."
          );
        }

        if (cancelled) return;

        if (data.video) {
          const nextStatus = data.video.status || "";

          setVideoStatus(nextStatus);
          setVideoProgress(data.video.progress ?? 0);

          if (nextStatus === "completed") {
            setVideoProgress(100);
            setVideoUrl(
              `/api/video-content?id=${encodeURIComponent(videoId)}`
            );
            return;
          }

          if (nextStatus === "failed") {
            setError(
              data.video.error?.message ||
                "La génération vidéo a échoué."
            );
            return;
          }
        }

        if (!cancelled) {
          timeoutId = window.setTimeout(checkVideoStatus, 5000);
        }
      } catch (error) {
        console.error("Erreur suivi Video:", error);

        if (!cancelled) {
          timeoutId = window.setTimeout(checkVideoStatus, 5000);
        }
      }
    };

    checkVideoStatus();

    return () => {
      cancelled = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [videoId, videoStatus]);

  useEffect(() => {
    if (!sourceImage) {
      setSourcePreview("");
      return;
    }

    const url = URL.createObjectURL(sourceImage);
    setSourcePreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [sourceImage]);

  async function useGeneratedImageAsSource() {
    if (!imageData) return;

    try {
      const src =
        imageType === "base64"
          ? `data:${imageMimeType};base64,${imageData}`
          : imageData;

      const response = await fetch(src);
      const blob = await response.blob();

      const file = new File(
        [blob],
        "CreatorBusinessAI-edited.png",
        {
          type: blob.type || imageMimeType || "image/png",
        }
      );

      setSourceImage(file);
      setImageData("");
      setResult("");
      setRoute("");
    } catch (error) {
      console.error("Erreur reutilisation image:", error);
      setError(
        "Impossible d'utiliser cette image comme nouvelle source."
      );
    }
  }

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
      let response: Response;

      if (sourceImage) {
        const formData = new FormData();

        formData.append("image", sourceImage);
        formData.append("prompt", message);
        formData.append("size", imageSize);
        formData.append("quality", imageQuality);

        response = await fetch("/api/image-edit", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/ai-router", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            imageSize,
            imageQuality,
            videoSize,
            videoSeconds,
            videoModel,
            voiceName,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur du AI Router.");
      }

      setRoute(
        sourceImage
          ? "image"
          : data.route || "general"
      );
      setResult(data.result || "");

      if (data.audio?.data) {
        setAudioData(data.audio.data);
        setAudioMimeType(data.audio.mimeType || "audio/mpeg");
      }

      if (data.video?.id) {
        setVideoId(data.video.id);
        setVideoStatus(data.video.status || "");
        setVideoProgress(data.video.progress ?? 0);
      }

      if (data.image?.data) {
        const nextImageType = data.image.type || "";
        const nextMimeType = data.image.mimeType || "image/png";
        const nextImageData = data.image.data;

        setImageData(nextImageData);
        setImageType(nextImageType);
        setImageMimeType(nextMimeType);

        const src =
          nextImageType === "base64"
            ? `data:${nextMimeType};base64,${nextImageData}`
            : nextImageData;

        setImageHistory((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            src,
            label: `Version ${current.length + 1}`,
          },
        ]);
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

            <div className="mb-4">
              <label className="block cursor-pointer rounded-2xl border border-dashed border-violet-400/30 bg-violet-500/10 p-5 text-center transition hover:bg-violet-500/15">
                <span className="block text-sm font-bold text-white">
                  Importer une image
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  PNG, JPG ou WEBP
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    setSourceImage(e.target.files?.[0] || null)
                  }
                />
              </label>

              {sourceImage && sourcePreview && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={sourcePreview}
                      alt="Aperçu de l'image importée"
                      className="h-auto w-full object-contain"
                    />
                  </div>

                  <p className="mt-3 text-xs font-semibold text-emerald-300">
                    Image sélectionnée : {sourceImage.name}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/[0.10]">
                      Remplacer
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          setSourceImage(e.target.files?.[0] || null)
                        }
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setSourceImage(null)}
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/15"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
                {sourceImage ? "Modification souhaitée" : "Votre demande"}
              </p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                sourceImage
                  ? "Exemple : remplace le fond par un studio futuriste bleu, garde le sujet intact..."
                  : "Exemple : Crée-moi une application mobile de réservation..."
              }
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

          {audioData && (
            <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                Audio généré
              </p>

              <audio
                controls
                className="mt-4 w-full"
                src={`data:${audioMimeType};base64,${audioData}`}
              />

              <a
                href={`data:${audioMimeType};base64,${audioData}`}
                download="CreatorBusinessAI-audio.mp3"
                className="mt-4 block rounded-2xl bg-amber-500 px-5 py-3 text-center font-bold text-white transition hover:bg-amber-400"
              >
                Télécharger l'audio
              </a>
            </div>
          )}

          {videoId && (
            <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Génération vidéo
              </p>

              <p className="mt-3 text-sm text-slate-200">
                Statut : <strong>{videoStatus || "inconnu"}</strong>
              </p>

              <p className="mt-2 text-sm text-slate-300">
                Progression : {videoProgress} %
              </p>

              <p className="mt-2 break-all text-xs text-slate-400">
                ID : {videoId}
              </p>

              {videoUrl && videoStatus === "completed" && (
                <div className="mt-5">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    <video
                      src={videoUrl}
                      controls
                      playsInline
                      className="h-auto w-full"
                    />
                  </div>

                  <a
                    href={videoUrl}
                    download={`CreatorBusinessAI-${videoId}.mp4`}
                    className="mt-4 block rounded-2xl bg-cyan-500 px-5 py-3 text-center font-bold text-white transition hover:bg-cyan-400"
                  >
                    Télécharger la vidéo
                  </a>
                </div>
              )}
            </div>
          )}

          {imageHistory.length > 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                Historique des versions
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {imageHistory.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(version.src);
                        const blob = await response.blob();

                        const file = new File(
                          [blob],
                          `${version.label.replace(/\s+/g, "-").toLowerCase()}.png`,
                          {
                            type: blob.type || "image/png",
                          }
                        );

                        setSourceImage(file);
                        setImageData("");
                        setResult("");
                        setRoute("");
                      } catch (error) {
                        console.error(
                          "Erreur reprise version:",
                          error
                        );
                        setError(
                          "Impossible de reprendre cette version."
                        );
                      }
                    }}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-violet-400/30 hover:bg-white/[0.05]"
                  >
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <img
                        src={version.src}
                        alt={version.label}
                        className="h-auto w-full object-contain"
                      />
                    </div>

                    <p className="mt-2 text-center text-xs font-bold text-slate-300">
                      {version.label}
                    </p>

                    <p className="mt-1 text-center text-[11px] text-violet-300">
                      Reprendre cette version
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {imageData && (
            <div className="mt-6 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                {sourcePreview ? "Avant / Après" : "Image générée"}
              </p>

              {sourcePreview ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Avant
                    </p>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      <img
                        src={sourcePreview}
                        alt="Image originale"
                        className="h-auto w-full object-contain"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Après
                    </p>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      <img
                        src={
                          imageType === "base64"
                            ? `data:${imageMimeType};base64,${imageData}`
                            : imageData
                        }
                        alt="Image modifiée par CreatorBusinessAI"
                        className="h-auto w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={downloadImage}
                  className="rounded-2xl bg-violet-500 px-5 py-3 font-bold text-white transition hover:bg-violet-400"
                >
                  Télécharger l'image
                </button>

                <button
                  onClick={useGeneratedImageAsSource}
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 font-bold text-emerald-300 transition hover:bg-emerald-500/15"
                >
                  Modifier encore
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
