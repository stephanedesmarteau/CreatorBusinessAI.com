"use client";

import { useEffect, useMemo, useState } from "react";

type BuilderFile = {
  path: string;
  content: string;
};

type BuilderProject = {
  id?: string;
  name: string;
  description?: string | null;
  stack?: string[];
  files: BuilderFile[];
};

type SavedProject = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  files: Array<{
    id: string;
    path: string;
    metadata?: any;
  }>;
};

export default function BuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [project, setProject] =
    useState<BuilderProject | null>(null);

  const [savedProjects, setSavedProjects] =
    useState<SavedProject[]>([]);

  const [selectedPath, setSelectedPath] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [loadingProjects, setLoadingProjects] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editInstruction, setEditInstruction] =
    useState("");

  const [editingFile, setEditingFile] =
    useState(false);

  const [previewHtml, setPreviewHtml] =
    useState("");

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [previewError, setPreviewError] =
    useState("");

  const [projectInstruction, setProjectInstruction] =
    useState("");

  const [editingProject, setEditingProject] =
    useState(false);

  const [projectEditSummary, setProjectEditSummary] =
    useState("");

  const [projectEditPlan, setProjectEditPlan] =
    useState<string[]>([]);

  const [changedFiles, setChangedFiles] =
    useState<string[]>([]);

  const selectedFile = useMemo(() => {
    if (!project || !selectedPath) {
      return null;
    }

    return (
      project.files.find(
        (file) =>
          file.path === selectedPath
      ) || null
    );
  }, [project, selectedPath]);

  async function loadSavedProjects() {
    setLoadingProjects(true);

    try {
      const response = await fetch(
        "/api/builder-projects"
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de charger les projets."
        );
      }

      setSavedProjects(
        Array.isArray(data.projects)
          ? data.projects
          : []
      );
    } catch (error) {
      console.error(
        "Erreur chargement projets:",
        error
      );
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    void loadSavedProjects();
  }, []);

  async function generateProject() {
    const cleanPrompt =
      prompt.trim();

    if (!cleanPrompt) {
      return;
    }

    setLoading(true);
    setError("");
    setProject(null);
    setSelectedPath("");
    setPreviewHtml("");
    setPreviewError("");

    try {
      const response = await fetch(
        "/api/builder",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de générer le projet."
        );
      }

      const nextProject =
        data.project as BuilderProject;

      setProject(nextProject);

      if (
        nextProject?.files?.length
      ) {
        setSelectedPath(
          nextProject.files[0].path
        );
      }

      await loadSavedProjects();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  async function editSelectedFile() {
    if (
      !selectedFile ||
      !editInstruction.trim() ||
      !project
    ) {
      return;
    }

    const savedProject = savedProjects.find(
      (item) => item.id === project.id
    );

    const savedFile = savedProject?.files.find(
      (file) => file.path === selectedFile.path
    );

    if (!savedFile?.id) {
      setError(
        "Impossible d'identifier ce fichier dans PostgreSQL."
      );
      return;
    }

    setEditingFile(true);
    setError("");

    try {
      const response = await fetch(
        "/api/builder-file",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fileId: savedFile.id,
            instruction:
              editInstruction.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de modifier le fichier."
        );
      }

      const updatedContent =
        String(
          data.file?.content ?? ""
        );

      setProject((current) => {
        if (!current) return current;

        return {
          ...current,
          files: current.files.map(
            (file) =>
              file.path === selectedFile.path
                ? {
                    ...file,
                    content:
                      updatedContent,
                  }
                : file
          ),
        };
      });

      setEditInstruction("");

      await loadSavedProjects();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l'édition."
      );
    } finally {
      setEditingFile(false);
    }
  }

  async function editWholeProject() {
    if (
      !project?.id ||
      !projectInstruction.trim()
    ) {
      return;
    }

    setEditingProject(true);
    setError("");
    setProjectEditSummary("");
    setProjectEditPlan([]);
    setChangedFiles([]);

    try {
      const response = await fetch(
        "/api/builder-project-edit",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId: project.id,
            instruction:
              projectInstruction.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de modifier le projet."
        );
      }

      const nextFiles =
        Array.isArray(data.files)
          ? data.files.map(
              (file: any) => ({
                path:
                  String(file.path || ""),
                content:
                  String(file.content || ""),
              })
            )
          : [];

      setProject((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          files: nextFiles,
        };
      });

      setProjectEditSummary(
        String(
          data.summary ||
            "Projet mis à jour."
        )
      );

      setProjectEditPlan(
        Array.isArray(data.plan)
          ? data.plan.map(
              (item: unknown) =>
                String(item)
            )
          : []
      );

      setChangedFiles(
        Array.isArray(
          data.changedFiles
        )
          ? data.changedFiles.map(
              (item: unknown) =>
                String(item)
            )
          : []
      );

      setProjectInstruction("");
      setPreviewHtml("");
      setPreviewError("");

      if (
        nextFiles.length &&
        !nextFiles.some(
          (file: BuilderFile) =>
            file.path === selectedPath
        )
      ) {
        setSelectedPath(
          nextFiles[0].path
        );
      }

      await loadSavedProjects();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant la modification du projet."
      );
    } finally {
      setEditingProject(false);
    }
  }

  async function generatePreview() {
    if (!project?.id) {
      setPreviewError(
        "Le projet doit être sauvegardé avant de générer l'aperçu."
      );
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");

    try {
      const response = await fetch(
        "/api/builder-preview",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId: project.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de générer l'aperçu."
        );
      }

      setPreviewHtml(
        String(data.html || "")
      );
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l'aperçu."
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function downloadProjectZip() {
    if (!project?.id) {
      setError(
        "Ce projet doit être sauvegardé avant l'export."
      );
      return;
    }

    window.location.href =
      `/api/builder-export?projectId=${encodeURIComponent(
        project.id
      )}`;
  }

  function openSavedProject(
    saved: SavedProject
  ) {
    const files: BuilderFile[] =
      saved.files
        .map((file) => {
          const metadata =
            file.metadata &&
            typeof file.metadata === "object"
              ? file.metadata
              : {};

          return {
            path:
              String(
                metadata.path ??
                  file.path ??
                  ""
              ),
            content:
              String(
                metadata.content ?? ""
              ),
          };
        })
        .filter(
          (file) =>
            file.path &&
            file.content
        );

    const loadedProject: BuilderProject = {
      id: saved.id,
      name: saved.name,
      description:
        saved.description || "",
      stack:
        Array.isArray(
          saved.files?.[0]?.metadata?.stack
        )
          ? saved.files[0].metadata.stack
          : [],
      files,
    };

    setProject(loadedProject);

    setSelectedPath(
      files[0]?.path || ""
    );

    setPreviewHtml("");
    setPreviewError("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-300">
                CreatorBusinessAI
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Website & App Builder
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Décris le projet à construire.
                CreatorBusinessAI génère une
                structure multi-fichiers complète,
                puis sauvegarde le projet dans
                PostgreSQL.
              </p>
            </div>

            <a
              href="/ai"
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-white/[0.09]"
            >
              Retour à AI Central
            </a>
          </div>

          <div className="mt-8">
            <label className="text-sm font-bold text-slate-200">
              Décris ton projet
            </label>

            <textarea
              value={prompt}
              onChange={(e) =>
                setPrompt(
                  e.target.value
                )
              }
              placeholder="Exemple : Crée un site SaaS premium pour une entreprise d'intelligence artificielle, avec landing page, tarifs, FAQ, tableau de bord et formulaire de contact."
              className="mt-3 min-h-44 w-full rounded-2xl border border-white/10 bg-black/20 p-5 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60"
            />

            <button
              type="button"
              onClick={generateProject}
              disabled={
                loading ||
                !prompt.trim()
              }
              className="mt-4 w-full rounded-2xl bg-blue-500 px-6 py-4 font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Construction du projet..."
                : "Construire le projet →"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Projets sauvegardés
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {savedProjects.length} projet(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadSavedProjects()
                }
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.09]"
              >
                {loadingProjects
                  ? "..."
                  : "Actualiser"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {savedProjects.length === 0 &&
                !loadingProjects && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                    Aucun projet généré pour
                    l'instant.
                  </div>
                )}

              {savedProjects.map(
                (saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() =>
                      openSavedProject(
                        saved
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-blue-400/30 hover:bg-blue-500/5"
                  >
                    <p className="font-bold text-white">
                      {saved.name}
                    </p>

                    {saved.description && (
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                        {
                          saved.description
                        }
                      </p>
                    )}

                    <p className="mt-3 text-xs text-blue-300">
                      {
                        saved.files
                          .length
                      }{" "}
                      fichier(s)
                    </p>
                  </button>
                )
              )}
            </div>
          </aside>

          <section className="min-w-0">
            {!project && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
                <p className="text-xl font-bold text-white">
                  Aucun projet ouvert
                </p>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                  Décris un projet ci-dessus ou
                  ouvre un projet sauvegardé pour
                  parcourir son code.
                </p>
              </div>
            )}

            {project && (
              <>
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    Projet généré
                  </p>

                  <h2 className="mt-3 text-2xl font-black text-white">
                    {project.name}
                  </h2>

                  {project.description && (
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {
                        project.description
                      }
                    </p>
                  )}

                  {project.id && (
                    <div className="mt-6 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                        Agent développeur autonome
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Demande une modification globale. CreatorBusinessAI analysera le projet entier et modifiera plusieurs fichiers si nécessaire.
                      </p>

                      <textarea
                        value={projectInstruction}
                        onChange={(e) =>
                          setProjectInstruction(
                            e.target.value
                          )
                        }
                        placeholder="Exemple : ajoute une page Contact, mets à jour la navigation, ajoute un CTA Contact dans le Hero et harmonise le footer."
                        className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/60"
                      />

                      <button
                        type="button"
                        onClick={editWholeProject}
                        disabled={
                          editingProject ||
                          !projectInstruction.trim()
                        }
                        className="mt-3 w-full rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editingProject
                          ? "Modification du projet..."
                          : "Améliorer tout le projet avec l'IA"}
                      </button>

                      {projectEditSummary && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-sm font-bold text-white">
                            {projectEditSummary}
                          </p>

                          {projectEditPlan.length > 0 && (
                            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                              {projectEditPlan.map(
                                (item, index) => (
                                  <li key={`${item}-${index}`}>
                                    {item}
                                  </li>
                                )
                              )}
                            </ol>
                          )}

                          {changedFiles.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                                Fichiers modifiés
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {changedFiles.map(
                                  (file) => (
                                    <span
                                      key={file}
                                      className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200"
                                    >
                                      {file}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {project.id && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={generatePreview}
                        disabled={previewLoading}
                        className="rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {previewLoading
                          ? "Création de l'aperçu..."
                          : "Aperçu live"}
                      </button>

                      <button
                        type="button"
                        onClick={downloadProjectZip}
                        className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                      >
                        Télécharger le projet ZIP
                      </button>
                    </div>
                  )}

                  {project.stack &&
                    project.stack.length >
                      0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {project.stack.map(
                          (item) => (
                            <span
                              key={item}
                              className="rounded-full border border-emerald-400/20 bg-black/20 px-3 py-1 text-xs font-bold text-emerald-200"
                            >
                              {item}
                            </span>
                          )
                        )}
                      </div>
                    )}
                </div>

                {previewError && (
                  <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                    {previewError}
                  </div>
                )}

                {previewHtml && (
                  <div className="mt-6 overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-black">
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                          Live Preview
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Aperçu isolé du projet généré
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={generatePreview}
                        disabled={previewLoading}
                        className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.09] disabled:opacity-50"
                      >
                        Actualiser
                      </button>
                    </div>

                    <iframe
                      title={`Aperçu ${project.name}`}
                      srcDoc={previewHtml}
                      sandbox="allow-scripts"
                      className="h-[760px] w-full bg-white"
                    />
                  </div>
                )}

                <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="px-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Fichiers
                    </p>

                    <div className="mt-4 space-y-2">
                      {project.files.map(
                        (file) => (
                          <button
                            key={
                              file.path
                            }
                            type="button"
                            onClick={() =>
                              setSelectedPath(
                                file.path
                              )
                            }
                            className={`w-full rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
                              selectedPath ===
                              file.path
                                ? "bg-blue-500 text-white"
                                : "bg-black/20 text-slate-300 hover:bg-white/[0.06]"
                            }`}
                          >
                            <span className="break-all">
                              {file.path}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <p className="break-all text-sm font-bold text-slate-200">
                        {selectedFile?.path ||
                          "Sélectionne un fichier"}
                      </p>

                      {selectedFile && (
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              selectedFile.content
                            )
                          }
                          className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.09]"
                        >
                          Copier
                        </button>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="border-b border-white/10 p-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
                          Modifier ce fichier avec l'IA
                        </p>

                        <textarea
                          value={editInstruction}
                          onChange={(e) =>
                            setEditInstruction(
                              e.target.value
                            )
                          }
                          placeholder="Exemple : rends le hero plus premium, ajoute un CTA secondaire et améliore l'espacement mobile."
                          className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/60"
                        />

                        <button
                          type="button"
                          onClick={editSelectedFile}
                          disabled={
                            editingFile ||
                            !editInstruction.trim()
                          }
                          className="mt-3 w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {editingFile
                            ? "Modification en cours..."
                            : "Modifier ce fichier avec l'IA"}
                        </button>
                      </div>
                    )}

                    <pre className="max-h-[700px] overflow-auto p-5 text-xs leading-6 text-slate-200">
                      <code>
                        {selectedFile?.content ||
                          "Aucun contenu."}
                      </code>
                    </pre>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
