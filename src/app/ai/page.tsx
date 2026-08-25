"use client";

import { useEffect, useState } from "react";

export default function AICentralPage() {
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [superMode, setSuperMode] = useState(true);
  const [orchestratorData, setOrchestratorData] = useState<any>(null);
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
  const [autoSpeakResponse, setAutoSpeakResponse] = useState(false);
  const [sourceAudio, setSourceAudio] = useState<File | null>(null);
  const [transcription, setTranscription] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [autoRunTranscription, setAutoRunTranscription] = useState(false);
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

  async function speakAgentResponse(text: string) {
    if (!text.trim()) return;

    const response = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Impossible de générer la réponse vocale."
      );
    }

    if (data.audio?.data) {
      setAudioData(data.audio.data);
      setAudioMimeType(data.audio.mimeType || "audio/mpeg");
    }
  }

  async function transcribeAudio() {
    if (!sourceAudio) return;

    setTranscribing(true);
    setLoading(false);
    setError("");
    setTranscription("");
    setRoute("");
    setResult("");
    setAudioData("");
    setVideoId("");
    setVideoStatus("");
    setVideoProgress(0);
    setVideoUrl("");
    setImageData("");
    setImageType("");

    try {
      // ÉTAPE 1 — AUDIO → TEXTE
      const formData = new FormData();
      formData.append("audio", sourceAudio);

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const transcriptionData =
        await transcriptionResponse.json();

      if (!transcriptionResponse.ok) {
        throw new Error(
          transcriptionData.error ||
            "Impossible de transcrire l'audio."
        );
      }

      const text = String(
        transcriptionData.text || ""
      ).trim();

      if (!text) {
        throw new Error(
          "La transcription audio est vide."
        );
      }

      setTranscription(text);
      setMessage(text);
      setTranscribing(false);

      // Mode transcription seulement.
      if (!autoRunTranscription) {
        setRoute("voice");
        return;
      }

      // ÉTAPE 2 — TRANSCRIPTION → AI CENTRAL
      setLoading(true);

      const routedMessage = `
Voici la transcription audio de l'utilisateur :

${text}

Traite le contenu ci-dessus comme la demande réelle de l'utilisateur.

Important :
- Ne choisis la route "voice" que si l'utilisateur demande explicitement
  une lecture vocale, une voix, une transcription, de l'audio ou du doublage.
- Si le contenu est informatif sans instruction explicite, réponds utilement
  au contenu au lieu de simplement le convertir en voix.
      `.trim();

      const aiResponse = await fetch("/api/ai-router", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: routedMessage,
          imageSize,
          imageQuality,
          videoSize,
          videoSeconds,
          videoModel,
          voiceName,
        }),
      });

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        throw new Error(
          aiData.error || "Erreur du AI Router."
        );
      }

      const nextRoute =
        aiData.route || "general";

      const nextResult =
        aiData.result || "";

      setRoute(nextRoute);
      setResult(nextResult);

      // ÉTAPE 3 — MÉDIAS RETOURNÉS PAR LE ROUTEUR
      if (aiData.audio?.data) {
        setAudioData(aiData.audio.data);
        setAudioMimeType(
          aiData.audio.mimeType || "audio/mpeg"
        );
      }

      if (aiData.video?.id) {
        setVideoId(aiData.video.id);
        setVideoStatus(aiData.video.status || "");
        setVideoProgress(
          aiData.video.progress ?? 0
        );
      }

      if (aiData.image?.data) {
        setImageData(aiData.image.data);
        setImageType(aiData.image.type || "");
        setImageMimeType(
          aiData.image.mimeType || "image/png"
        );
      }

      // ÉTAPE 4 — RÉPONSE TEXTE → VOIX
      // Appel direct à /api/speak, sans repasser par AI Router.
      if (
        autoSpeakResponse &&
        nextResult.trim() &&
        nextRoute !== "voice"
      ) {
        await speakAgentResponse(nextResult);
      }
    } catch (error) {
      console.error(
        "Erreur chaîne multimodale:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant la chaîne multimodale."
      );
    } finally {
      setTranscribing(false);
      setLoading(false);
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

  async function ensureConversation() {
    if (conversationId) {
      return conversationId;
    }

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title:
            message.trim().slice(0, 80) ||
            "Conversation AI Central",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.conversation?.id) {
        throw new Error(
          data.error ||
            "Impossible de créer la conversation."
        );
      }

      const id = String(data.conversation.id);
      setConversationId(id);

      return id;
    } catch (error) {
      console.warn(
        "Conversation persistante indisponible:",
        error
      );

      return "";
    }
  }

  async function getConversationContext(
    activeConversationId: string
  ) {
    if (!activeConversationId) {
      return "";
    }

    try {
      const response = await fetch(
        `/api/messages?conversationId=${encodeURIComponent(
          activeConversationId
        )}`
      );

      const data = await response.json();

      if (!response.ok || !Array.isArray(data.messages)) {
        return "";
      }

      const recent = data.messages.slice(-12);

      if (!recent.length) {
        return "";
      }

      return recent
        .map((item: any) => {
          const role =
            item.role === "USER"
              ? "Utilisateur"
              : item.role === "ASSISTANT"
                ? "CreatorBusinessAI"
                : item.role;

          return `${role}: ${item.content}`;
        })
        .join("\\n\\n");
    } catch (error) {
      console.warn(
        "Contexte conversation indisponible:",
        error
      );

      return "";
    }
  }

  async function saveConversationMessage(
    activeConversationId: string,
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL",
    content: string,
    options?: {
      route?: string;
      model?: string;
      metadata?: unknown;
    }
  ) {
    if (
      !activeConversationId ||
      !content.trim()
    ) {
      return;
    }

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          role,
          content,
          route: options?.route,
          model: options?.model,
          metadata: options?.metadata,
        }),
      });
    } catch (error) {
      console.warn(
        "Sauvegarde message indisponible:",
        error
      );
    }
  }

  async function saveAgentRuns(
    orchestrator: any
  ) {
    if (!orchestrator?.steps) {
      return;
    }

    const steps = Array.isArray(
      orchestrator.steps
    )
      ? orchestrator.steps
      : [];

    await Promise.allSettled(
      steps.map((step: any) =>
        fetch("/api/agent-runs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent: step.agent || "unknown",
            objective: step.objective || "",
            status:
              step.status === "failed"
                ? "FAILED"
                : "COMPLETED",
            input: {
              title: step.title || "",
            },
            output: {
              text: step.output || "",
            },
          }),
        })
      )
    );
  }

  async function routeRequest() {
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setRoute("");
    setResult("");
    setOrchestratorData(null);
    setImageData("");
    setImageType("");
    setImageMimeType("image/png");

    try {
      const activeConversationId =
        await ensureConversation();

      const previousContext =
        await getConversationContext(
          activeConversationId
        );

      await saveConversationMessage(
        activeConversationId,
        "USER",
        message
      );

      const contextualMessage =
        previousContext.trim()
          ? `
CONTEXTE DE CONVERSATION PERSISTANT

${previousContext}

NOUVELLE DEMANDE DE L'UTILISATEUR

${message}

Réponds principalement à la nouvelle demande, en utilisant le contexte précédent seulement lorsqu'il est pertinent.
            `.trim()
          : message;

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
        response = await fetch(
          superMode
            ? "/api/orchestrator"
            : "/api/ai-router",
          {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: contextualMessage,
            imageSize,
            imageQuality,
            videoSize,
            videoSeconds,
            videoModel,
            voiceName,
          }),
          }
        );
      }

      const data = await response.json();

      if (data.orchestrator) {
        setOrchestratorData(data.orchestrator);
      }

      if (!response.ok) {
        throw new Error(data.error || "Erreur du AI Router.");
      }

      const nextRoute =
        sourceImage
          ? "image"
          : data.route || "general";

      const nextResult = data.result || "";

      setRoute(nextRoute);
      setResult(nextResult);

      if (nextResult.trim()) {
        await saveConversationMessage(
          activeConversationId,
          "ASSISTANT",
          nextResult,
          {
            route: nextRoute,
            metadata: data.orchestrator
              ? {
                  orchestrator: {
                    strategy:
                      data.orchestrator.strategy,
                    plan:
                      data.orchestrator.plan,
                  },
                }
              : undefined,
          }
        );
      }

      if (data.orchestrator) {
        await saveAgentRuns(
          data.orchestrator
        );
      }

      if (
        autoSpeakResponse &&
        nextResult.trim() &&
        nextRoute !== "voice"
      ) {
        await speakAgentResponse(nextResult);
      }

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

            <div className="mb-4">
              <label className="block cursor-pointer rounded-2xl border border-dashed border-amber-400/30 bg-amber-500/10 p-5 text-center transition hover:bg-amber-500/15">
                <span className="block text-sm font-bold text-white">
                  Importer un audio
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  MP3, WAV, M4A, WEBM
                </span>

                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) =>
                    setSourceAudio(e.target.files?.[0] || null)
                  }
                />
              </label>

              {sourceAudio && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-amber-300">
                    Audio sélectionné : {sourceAudio.name}
                  </p>

                  <button
                    type="button"
                    onClick={transcribeAudio}
                    disabled={transcribing}
                    className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transcribing
                      ? "Transcription en cours..."
                      : "Transcrire l'audio"}
                  </button>

                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <input
                      type="checkbox"
                      checked={autoRunTranscription}
                      onChange={(e) =>
                        setAutoRunTranscription(e.target.checked)
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm text-slate-300">
                      Envoyer automatiquement la transcription à AI Central
                    </span>
                  </label>

                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <input
                      type="checkbox"
                      checked={autoSpeakResponse}
                      onChange={(e) =>
                        setAutoSpeakResponse(e.target.checked)
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm text-slate-300">
                      Lire automatiquement la réponse de l'IA
                    </span>
                  </label>
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

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div>
                <p className="text-sm font-bold text-fuchsia-200">
                  Mode Super AI
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {superMode
                    ? "ACTIVÉ — plusieurs agents collaborent, planifient et synthétisent la mission."
                    : "DÉSACTIVÉ — une seule route IA sera utilisée."}
                </p>
              </div>

              <input
                type="checkbox"
                checked={superMode}
                onChange={(e) =>
                  setSuperMode(e.target.checked)
                }
                className="h-5 w-5"
              />
            </label>

            <button
              onClick={routeRequest}
              disabled={loading || !message.trim()}
              className="mt-4 w-full rounded-2xl bg-blue-500 px-6 py-4 font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? superMode
                  ? "Super AI en cours..."
                  : "Analyse de la demande..."
                : superMode
                  ? "Lancer Super AI →"
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

          {orchestratorData && (
            <div className="mt-6 rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                Super Orchestrator
              </p>

              <p className="mt-3 text-sm text-slate-200">
                {orchestratorData.strategy}
              </p>

              <div className="mt-5 grid gap-3">
                {orchestratorData.steps?.map(
                  (step: any, index: number) => (
                    <div
                      key={step.id || index}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-white">
                          {index + 1}. {step.title}
                        </p>

                        <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold uppercase text-fuchsia-200">
                          {step.agent}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-300">
                        {step.objective}
                      </p>

                      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                        {step.status}
                      </p>
                    </div>
                  )
                )}
              </div>
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

          {transcription && (
            <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                Transcription audio
              </p>

              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {transcription}
              </div>

              <button
                type="button"
                onClick={() => setMessage(transcription)}
                className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 font-bold text-blue-300 transition hover:bg-blue-500/15"
              >
                Utiliser ce texte dans AI Central
              </button>
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
