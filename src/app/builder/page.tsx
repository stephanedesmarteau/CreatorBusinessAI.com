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

type ProjectVersion = {
  id: string;
  label?: string | null;
  description?: string | null;
  createdAt: string;
};

type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  file?: string;
  message: string;
};

type ValidationReport = {
  valid: boolean;
  score: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
};

type RealBuildReport = {
  success: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
};

type RuntimeStatus = {
  running: boolean;
  projectId: string;
  port?: number;
  url?: string;
  startedAt?: string;
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

  const [previewPages, setPreviewPages] =
    useState<
      Array<{
        route: string;
        title: string;
        html: string;
      }>
    >([]);

  const [previewRoute, setPreviewRoute] =
    useState("/");

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

  const [versions, setVersions] =
    useState<ProjectVersion[]>([]);

  const [loadingVersions, setLoadingVersions] =
    useState(false);

  const [creatingVersion, setCreatingVersion] =
    useState(false);

  const [restoringVersionId, setRestoringVersionId] =
    useState("");

  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null);

  const [validatingProject, setValidatingProject] =
    useState(false);

  const [repairingProject, setRepairingProject] =
    useState(false);

  const [realBuildReport, setRealBuildReport] =
    useState<RealBuildReport | null>(null);

  const [buildingProject, setBuildingProject] =
    useState(false);

  const [repairingBuild, setRepairingBuild] =
    useState(false);

  const [runtimeStatus, setRuntimeStatus] =
    useState<RuntimeStatus | null>(null);

  const [startingRuntime, setStartingRuntime] =
    useState(false);

  const [stoppingRuntime, setStoppingRuntime] =
    useState(false);

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

  async function loadRuntimeStatus(
    projectId?: string
  ) {
    const id =
      projectId ||
      project?.id;

    if (!id) {
      setRuntimeStatus(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/builder-runtime?projectId=${encodeURIComponent(
          id
        )}`
      );

      const data =
        await response.json();

      if (!response.ok) {
        return;
      }

      setRuntimeStatus(
        data.runtime || null
      );
    } catch (error) {
      console.warn(
        "Runtime status indisponible:",
        error
      );
    }
  }

  async function startRealRuntime() {
    if (!project?.id) {
      return;
    }

    setStartingRuntime(true);
    setError("");

    try {
      const response = await fetch(
        "/api/builder-runtime",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de démarrer l'application réelle."
        );
      }

      setRuntimeStatus(
        data.runtime || null
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de démarrer l'application réelle."
      );
    } finally {
      setStartingRuntime(false);
    }
  }

  async function stopRealRuntime() {
    if (!project?.id) {
      return;
    }

    setStoppingRuntime(true);
    setError("");

    try {
      const response = await fetch(
        `/api/builder-runtime?projectId=${encodeURIComponent(
          project.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'arrêter l'application."
        );
      }

      setRuntimeStatus(
        data.runtime || {
          running: false,
          projectId:
            project.id,
        }
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'arrêter l'application."
      );
    } finally {
      setStoppingRuntime(false);
    }
  }

  function openRealRuntime() {
    if (
      !runtimeStatus?.running ||
      !runtimeStatus.url
    ) {
      return;
    }

    window.open(
      runtimeStatus.url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function runRealBuild() {
    if (!project?.id) {
      return null;
    }

    setBuildingProject(true);
    setError("");

    try {
      const response = await fetch(
        "/api/builder-build",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de compiler réellement le projet."
        );
      }

      const report =
        data.build as RealBuildReport;

      setRealBuildReport(
        report
      );

      return report;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de compiler réellement le projet."
      );

      return null;
    } finally {
      setBuildingProject(false);
    }
  }

  async function repairRealBuild() {
    if (
      !project?.id ||
      !realBuildReport ||
      realBuildReport.success
    ) {
      return;
    }

    setRepairingBuild(true);
    setError("");

    try {
      const buildLogs = `
STDOUT

${realBuildReport.stdout}

STDERR

${realBuildReport.stderr}
      `.trim();

      const instruction = `
Le vrai build npm / Next.js de ce projet a échoué.

Analyse les erreurs réelles ci-dessous et répare le projet.

RÈGLES :
- corrige uniquement les causes du build échoué ;
- conserve le design et les fonctionnalités existantes ;
- conserve l'architecture autant que possible ;
- corrige les erreurs TypeScript ;
- corrige les imports et exports cassés ;
- corrige les dépendances manquantes dans package.json ;
- corrige les incompatibilités Next.js / React / Tailwind ;
- crée un fichier seulement si réellement nécessaire ;
- ne supprime pas une fonctionnalité pour masquer une erreur ;
- n'ajoute aucune dépendance inutile.

LOGS DU BUILD RÉEL

${buildLogs}
      `.trim();

      const response = await fetch(
        "/api/builder-project-edit",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
            instruction,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de réparer les erreurs de compilation."
        );
      }

      const nextFiles =
        Array.isArray(data.files)
          ? data.files.map(
              (file: any) => ({
                path: String(
                  file.path || ""
                ),
                content: String(
                  file.content || ""
                ),
              })
            )
          : [];

      setProject((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          files:
            nextFiles,
        };
      });

      setProjectEditSummary(
        String(
          data.summary ||
            "Réparation du build terminée."
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

      setPreviewHtml("");
      setPreviewPages([]);
      setPreviewRoute("/");
      setPreviewError("");
      setValidationReport(null);

      await loadSavedProjects();
      await loadVersions(
        project.id
      );

      const validation =
        await validateProject();

      if (
        validation &&
        validation.valid
      ) {
        await runRealBuild();
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de réparer le build."
      );
    } finally {
      setRepairingBuild(false);
    }
  }

  async function validateProject() {
    if (!project?.id) {
      return null;
    }

    setValidatingProject(true);
    setError("");

    try {
      const response = await fetch(
        "/api/builder-validate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'analyser le projet."
        );
      }

      const report =
        data.report as ValidationReport;

      setValidationReport(
        report
      );

      return report;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'analyser le projet."
      );

      return null;
    } finally {
      setValidatingProject(false);
    }
  }

  async function repairValidationIssues() {
    if (
      !project?.id ||
      !validationReport ||
      validationReport.valid
    ) {
      return;
    }

    setRepairingProject(true);
    setError("");

    try {
      const issueText =
        validationReport.issues
          .map(
            (issue, index) =>
              `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.code}` +
              `${issue.file ? ` — ${issue.file}` : ""}` +
              ` — ${issue.message}`
          )
          .join("\\n");

      const instruction = `
Répare automatiquement les problèmes détectés dans ce projet.

RÈGLES :
- corrige uniquement les problèmes nécessaires ;
- conserve le design et les fonctionnalités actuelles ;
- conserve l'architecture existante autant que possible ;
- corrige les imports cassés ;
- crée les fichiers manquants si nécessaire ;
- corrige package.json ou les fichiers JSON invalides ;
- corrige les problèmes structurels TypeScript / TSX évidents ;
- n'ajoute aucune dépendance inutile ;
- ne supprime aucune fonctionnalité fonctionnelle.

RAPPORT DE VALIDATION

${issueText}
      `.trim();

      const response = await fetch(
        "/api/builder-project-edit",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
            instruction,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de réparer le projet."
        );
      }

      const nextFiles =
        Array.isArray(data.files)
          ? data.files.map(
              (file: any) => ({
                path: String(
                  file.path || ""
                ),
                content: String(
                  file.content || ""
                ),
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
            "Réparation automatique terminée."
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

      setPreviewHtml("");
      setPreviewPages([]);
      setPreviewRoute("/");
      setPreviewError("");

      await loadSavedProjects();
      await loadVersions(
        project.id
      );

      await validateProject();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de réparer automatiquement le projet."
      );
    } finally {
      setRepairingProject(false);
    }
  }

  async function loadVersions(
    projectId?: string
  ) {
    const id =
      projectId ||
      project?.id;

    if (!id) {
      setVersions([]);
      return;
    }

    setLoadingVersions(true);

    try {
      const response = await fetch(
        `/api/builder-versions?projectId=${encodeURIComponent(
          id
        )}`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de charger l'historique."
        );
      }

      setVersions(
        Array.isArray(data.versions)
          ? data.versions
          : []
      );
    } catch (error) {
      console.error(
        "Erreur historique versions:",
        error
      );
    } finally {
      setLoadingVersions(false);
    }
  }

  async function createManualVersion() {
    if (!project?.id) {
      return;
    }

    setCreatingVersion(true);
    setError("");

    try {
      const response = await fetch(
        "/api/builder-versions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
            label:
              "Point de sauvegarde manuel",
            description:
              "Version créée manuellement depuis le Builder.",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de créer la version."
        );
      }

      await loadVersions(
        project.id
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de créer le point de sauvegarde."
      );
    } finally {
      setCreatingVersion(false);
    }
  }

  async function restoreVersion(
    versionId: string
  ) {
    if (
      !project?.id ||
      !versionId
    ) {
      return;
    }

    setRestoringVersionId(
      versionId
    );
    setError("");

    try {
      const response = await fetch(
        "/api/builder-versions",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId:
              project.id,
            versionId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de restaurer cette version."
        );
      }

      const nextFiles =
        Array.isArray(data.files)
          ? data.files.map(
              (file: any) => ({
                path: String(
                  file.path || ""
                ),
                content: String(
                  file.content || ""
                ),
              })
            )
          : [];

      setProject((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          files:
            nextFiles,
        };
      });

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

      setPreviewHtml("");
      setPreviewPages([]);
      setPreviewRoute("/");
      setPreviewError("");
      setProjectEditSummary("");
      setProjectEditPlan([]);
      setChangedFiles([]);

      await loadSavedProjects();
      await loadVersions(
        project.id
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de restaurer cette version."
      );
    } finally {
      setRestoringVersionId(
        ""
      );
    }
  }

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
    setPreviewPages([]);
    setPreviewRoute("/");
    setPreviewError("");
    setValidationReport(null);
    setRealBuildReport(null);
    setRuntimeStatus(null);

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

      if (nextProject?.id) {
        await loadVersions(
          nextProject.id
        );
      }
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
      setPreviewPages([]);
      setPreviewRoute("/");
      setPreviewError("");
      setValidationReport(null);
      setRealBuildReport(null);
      setRuntimeStatus(null);

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
      await loadVersions(
        project.id
      );
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

      const pages =
        Array.isArray(data.pages)
          ? data.pages.map(
              (page: any) => ({
                route: String(
                  page.route || "/"
                ),
                title: String(
                  page.title ||
                    page.route ||
                    "Page"
                ),
                html: String(
                  page.html || ""
                ),
              })
            )
          : [];

      const defaultRoute =
        String(
          data.defaultRoute ||
            pages[0]?.route ||
            "/"
        );

      setPreviewPages(pages);
      setPreviewRoute(defaultRoute);

      const active =
        pages.find(
          (page: any) =>
            page.route === defaultRoute
        );

      setPreviewHtml(
        String(
          active?.html || ""
        )
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

  function openPreviewRoute(
    route: string
  ) {
    const page =
      previewPages.find(
        (item) =>
          item.route === route
      );

    if (!page) {
      return;
    }

    setPreviewRoute(route);
    setPreviewHtml(page.html);
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
    setPreviewPages([]);
    setPreviewRoute("/");
    setPreviewError("");
    setValidationReport(null);
    setRealBuildReport(null);
    setError("");

    void loadVersions(
      saved.id
    );

    void loadRuntimeStatus(
      saved.id
    );
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
                    <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                            Historique des versions
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            Crée un point de sauvegarde ou restaure une ancienne version du projet.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={createManualVersion}
                          disabled={creatingVersion}
                          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingVersion
                            ? "Sauvegarde..."
                            : "Créer un point de sauvegarde"}
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {loadingVersions && (
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
                            Chargement de l'historique...
                          </div>
                        )}

                        {!loadingVersions &&
                          versions.length === 0 && (
                            <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-3 text-sm text-slate-500">
                              Aucune version enregistrée pour l'instant.
                            </div>
                          )}

                        {versions.map(
                          (version) => (
                            <div
                              key={version.id}
                              className="rounded-xl border border-white/10 bg-black/20 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-bold text-white">
                                    {version.label ||
                                      "Version du projet"}
                                  </p>

                                  {version.description && (
                                    <p className="mt-1 text-xs leading-5 text-slate-400">
                                      {version.description}
                                    </p>
                                  )}

                                  <p className="mt-2 text-xs text-amber-200">
                                    {new Date(
                                      version.createdAt
                                    ).toLocaleString()}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    restoreVersion(
                                      version.id
                                    )
                                  }
                                  disabled={
                                    restoringVersionId ===
                                    version.id
                                  }
                                  className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {restoringVersionId ===
                                  version.id
                                    ? "Restauration..."
                                    : "Restaurer"}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {project.id && (
                    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                            Validation du projet
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            Analyse la structure, les imports et les fichiers du projet avant export ou déploiement.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={validateProject}
                          disabled={validatingProject}
                          className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {validatingProject
                            ? "Analyse..."
                            : "Analyser le projet"}
                        </button>
                      </div>

                      {validationReport && (
                        <div className="mt-4">
                          <div className="grid gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Score
                              </p>
                              <p className="mt-2 text-2xl font-black text-white">
                                {validationReport.score}/100
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Statut
                              </p>
                              <p
                                className={`mt-2 text-sm font-bold ${
                                  validationReport.valid
                                    ? "text-emerald-300"
                                    : "text-red-300"
                                }`}
                              >
                                {validationReport.valid
                                  ? "Projet valide"
                                  : "Corrections requises"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Erreurs
                              </p>
                              <p className="mt-2 text-2xl font-black text-red-300">
                                {validationReport.errors}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Avertissements
                              </p>
                              <p className="mt-2 text-2xl font-black text-amber-300">
                                {validationReport.warnings}
                              </p>
                            </div>
                          </div>

                          {validationReport.issues.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {validationReport.issues.map(
                                (issue, index) => (
                                  <div
                                    key={`${issue.code}-${issue.file || "global"}-${index}`}
                                    className={`rounded-xl border p-3 text-sm ${
                                      issue.severity === "error"
                                        ? "border-red-400/20 bg-red-500/10 text-red-200"
                                        : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                                    }`}
                                  >
                                    <p className="font-bold">
                                      {issue.code}
                                    </p>

                                    {issue.file && (
                                      <p className="mt-1 break-all text-xs opacity-80">
                                        {issue.file}
                                      </p>
                                    )}

                                    <p className="mt-2 text-xs leading-5">
                                      {issue.message}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {!validationReport.valid && (
                            <button
                              type="button"
                              onClick={repairValidationIssues}
                              disabled={repairingProject}
                              className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {repairingProject
                                ? "Réparation automatique..."
                                : "Réparer automatiquement avec l'IA"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {project.id && (
                    <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                            Compilation réelle
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            Installe les dépendances dans un dossier temporaire et lance le vrai build Next.js du projet.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={runRealBuild}
                          disabled={buildingProject}
                          className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {buildingProject
                            ? "Compilation..."
                            : "Compiler réellement"}
                        </button>
                      </div>

                      {realBuildReport && (
                        <div className="mt-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Statut
                              </p>

                              <p
                                className={`mt-2 text-sm font-bold ${
                                  realBuildReport.success
                                    ? "text-emerald-300"
                                    : "text-red-300"
                                }`}
                              >
                                {realBuildReport.success
                                  ? "Build réussi"
                                  : "Build échoué"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Code de sortie
                              </p>

                              <p className="mt-2 text-2xl font-black text-white">
                                {realBuildReport.exitCode ??
                                  "—"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-widest text-slate-500">
                                Durée
                              </p>

                              <p className="mt-2 text-2xl font-black text-white">
                                {Math.round(
                                  realBuildReport.durationMs /
                                    1000
                                )}
                                s
                              </p>
                            </div>
                          </div>

                          {(realBuildReport.stdout ||
                            realBuildReport.stderr) && (
                            <details className="mt-4 rounded-xl border border-white/10 bg-black/30">
                              <summary className="cursor-pointer p-4 text-sm font-bold text-slate-200">
                                Voir les logs du build
                              </summary>

                              <div className="border-t border-white/10 p-4">
                                {realBuildReport.stdout && (
                                  <>
                                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                                      STDOUT
                                    </p>

                                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
                                      {realBuildReport.stdout}
                                    </pre>
                                  </>
                                )}

                                {realBuildReport.stderr && (
                                  <>
                                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-red-300">
                                      STDERR
                                    </p>

                                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-red-200">
                                      {realBuildReport.stderr}
                                    </pre>
                                  </>
                                )}
                              </div>
                            </details>
                          )}

                          {!realBuildReport.success && (
                            <button
                              type="button"
                              onClick={repairRealBuild}
                              disabled={repairingBuild}
                              className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {repairingBuild
                                ? "Réparation du build..."
                                : "Réparer les erreurs de build avec l'IA"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {project.id && (
                    <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
                            Application réelle
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            Démarre le vrai projet Next.js compilé sur un port local temporaire.
                          </p>
                        </div>

                        <div
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            runtimeStatus?.running
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          {runtimeStatus?.running
                            ? "EN LIGNE"
                            : "ARRÊTÉ"}
                        </div>
                      </div>

                      {runtimeStatus?.running &&
                        runtimeStatus.url && (
                          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-black/20 p-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                              URL locale
                            </p>

                            <p className="mt-2 break-all font-mono text-sm text-white">
                              {runtimeStatus.url}
                            </p>

                            {runtimeStatus.port && (
                              <p className="mt-2 text-xs text-slate-400">
                                Port {runtimeStatus.port}
                              </p>
                            )}
                          </div>
                        )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {!runtimeStatus?.running && (
                          <button
                            type="button"
                            onClick={startRealRuntime}
                            disabled={
                              startingRuntime ||
                              realBuildReport?.success !== true
                            }
                            className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {startingRuntime
                              ? "Démarrage de l'application..."
                              : "Démarrer l'application réelle"}
                          </button>
                        )}

                        {runtimeStatus?.running && (
                          <>
                            <button
                              type="button"
                              onClick={openRealRuntime}
                              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                            >
                              Ouvrir l'application
                            </button>

                            <button
                              type="button"
                              onClick={stopRealRuntime}
                              disabled={stoppingRuntime}
                              className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {stoppingRuntime
                                ? "Arrêt..."
                                : "Arrêter l'application"}
                            </button>
                          </>
                        )}
                      </div>

                      {realBuildReport?.success !== true &&
                        !runtimeStatus?.running && (
                          <p className="mt-3 text-xs text-slate-400">
                            Compile d'abord le projet avec succès avant de démarrer l'application réelle.
                          </p>
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
                    <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                            Live Preview
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Aperçu multi-pages isolé du projet généré
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

                      {previewPages.length > 1 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {previewPages.map(
                            (page) => (
                              <button
                                key={page.route}
                                type="button"
                                onClick={() =>
                                  openPreviewRoute(
                                    page.route
                                  )
                                }
                                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                                  previewRoute ===
                                  page.route
                                    ? "bg-fuchsia-500 text-white"
                                    : "border border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]"
                                }`}
                              >
                                {page.title}
                              </button>
                            )
                          )}
                        </div>
                      )}
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
