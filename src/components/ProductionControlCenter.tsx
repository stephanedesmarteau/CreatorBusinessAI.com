"use client";

import { useEffect, useMemo, useState } from "react";

type DeploymentStatus =
  | "PREPARING"
  | "READY"
  | "DEPLOYING"
  | "DEPLOYED"
  | "FAILED"
  | "ROLLING_BACK"
  | "ROLLED_BACK";

type Deployment = {
  id: string;
  status: DeploymentStatus;
  provider?: string | null;
  environment?: string | null;
  readiness?: {
    ready?: boolean;
    score?: number;
  } | null;
  productionUrl?: string | null;
  deploymentUrl?: string | null;
  commitSha?: string | null;
  providerData?: Record<string, any> | null;
  error?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type Props = {
  projectId: string;
  projectName?: string;
};

async function readJson(response: Response) {
  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Erreur HTTP ${response.status}`
    );
  }

  return data;
}

function statusLabel(
  status: DeploymentStatus
) {
  const labels: Record<
    DeploymentStatus,
    string
  > = {
    PREPARING: "PRÉPARATION",
    READY: "PRÊT",
    DEPLOYING: "DÉPLOIEMENT",
    DEPLOYED: "EN PRODUCTION",
    FAILED: "ÉCHEC",
    ROLLING_BACK: "ROLLBACK",
    ROLLED_BACK: "RESTAURÉ",
  };

  return labels[status] || status;
}

export default function ProductionControlCenter({
  projectId,
  projectName,
}: Props) {
  const [deployments, setDeployments] =
    useState<Deployment[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [action, setAction] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [rollbackPlan, setRollbackPlan] =
    useState<any>(null);

  const [productionVerification, setProductionVerification] =
    useState<{
      deploymentId: string;
      url: string;
      finalUrl: string;
      reachable: boolean;
      status: number;
      statusText: string;
      contentType: string | null;
      durationMs: number;
      checkedAt: string;
    } | null>(null);

  const latest = useMemo(
    () => deployments[0] || null,
    [deployments]
  );

  async function loadDeployments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/production-engine/deployments?projectId=${encodeURIComponent(
          projectId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      const items = Array.isArray(data.deployments)
        ? data.deployments
        : [];

      items.sort(
        (a: Deployment, b: Deployment) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setDeployments(items);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger les déploiements."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeployments();
  }, [projectId]);

  async function prepareDeployment() {
    if (action) return;

    setAction("prepare");
    setError("");
    setMessage("");
    setRollbackPlan(null);

    try {
      const response = await fetch(
        "/api/production-engine/deployments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
          }),
        }
      );

      await readJson(response);

      setMessage(
        "Déploiement préparé avec succès."
      );

      await loadDeployments();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de préparer le déploiement."
      );
    } finally {
      setAction("");
    }
  }

  async function publishGitHub(
    deploymentId: string
  ) {
    if (action) return;

    const confirmed = window.confirm(
      "Publier ce projet dans un dépôt GitHub privé ?"
    );

    if (!confirmed) return;

    setAction(`github:${deploymentId}`);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/production-engine/deployments/${deploymentId}/github`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            private: true,
          }),
        }
      );

      await readJson(response);

      setMessage(
        "Publication GitHub terminée."
      );

      await loadDeployments();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de publier sur GitHub."
      );
    } finally {
      setAction("");
    }
  }

  async function deployVercel(
    deploymentId: string
  ) {
    if (action) return;

    const confirmed = window.confirm(
      "Déployer maintenant cette version en production publique sur Vercel ?"
    );

    if (!confirmed) return;

    setAction(`vercel:${deploymentId}`);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/production-engine/deployments/${deploymentId}/vercel`,
        {
          method: "POST",
        }
      );

      await readJson(response);

      setMessage(
        "Déploiement Vercel terminé."
      );

      await loadDeployments();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de déployer sur Vercel."
      );

      await loadDeployments();
    } finally {
      setAction("");
    }
  }

  async function verifyProduction(
    deploymentId: string
  ) {
    if (action) return;

    setAction(`verify:${deploymentId}`);
    setError("");
    setMessage("");
    setProductionVerification(null);

    try {
      const response = await fetch(
        `/api/production-engine/deployments/${deploymentId}/verify`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!data.verification) {
        throw new Error(
          "Résultat de vérification invalide."
        );
      }

      setProductionVerification(
        data.verification
      );

      setMessage(
        data.verification.reachable
          ? `Production vérifiée : HTTP ${data.verification.status}.`
          : `La production a répondu HTTP ${data.verification.status}.`
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de vérifier la production."
      );
    } finally {
      setAction("");
    }
  }

  async function prepareRollback(
    deploymentId: string
  ) {
    if (action) return;

    setAction(`rollback:${deploymentId}`);
    setError("");
    setMessage("");
    setRollbackPlan(null);

    try {
      const response = await fetch(
        `/api/production-engine/deployments/${deploymentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "prepare-rollback",
          }),
        }
      );

      const data = await readJson(response);

      setRollbackPlan(data.rollback);

      setMessage(
        "Plan de rollback préparé. Aucune restauration n'a été exécutée."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de préparer le rollback."
      );
    } finally {
      setAction("");
    }
  }

  async function executeRollback(
    deploymentId: string
  ) {
    if (action || !rollbackPlan) return;

    const confirmed = window.confirm(
      "ATTENTION : cette action va redéployer le snapshot de production sauvegardé sur Vercel. Voulez-vous réellement exécuter le rollback ?"
    );

    if (!confirmed) {
      setMessage(
        "Rollback annulé. La production n'a pas été modifiée."
      );
      return;
    }

    setAction(`execute-rollback:${deploymentId}`);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/production-engine/deployments/${deploymentId}/rollback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmation: "ROLLBACK_PRODUCTION",
          }),
        }
      );

      const data = await readJson(response);

      setRollbackPlan(null);

      setMessage(
        "Rollback exécuté. Actualisation de l'état de production..."
      );

      await loadDeployments();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'exécuter le rollback."
      );
    } finally {
      setAction("");
    }
  }

  const githubData =
    latest?.providerData?.github || null;

  const vercelData =
    latest?.providerData?.vercel || null;

  const productionUrl =
    latest?.productionUrl ||
    latest?.deploymentUrl ||
    vercelData?.productionUrl ||
    vercelData?.deploymentUrl ||
    vercelData?.url ||
    null;

  const githubUrl =
    githubData?.repositoryUrl ||
    githubData?.url ||
    githubData?.htmlUrl ||
    null;

  const githubReady =
    Boolean(latest?.commitSha) ||
    Boolean(githubData?.commit);

  return (
    <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Production Control Center
          </p>

          <h3 className="mt-2 text-xl font-black text-white">
            {projectName || "Projet"}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Prépare, publie sur GitHub et déploie
            le projet en production Vercel depuis
            le Builder.
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Mode local : GitHub et Vercel utilisent
            les identifiants CLI configurés sur cette
            machine.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDeployments()}
          disabled={loading || Boolean(action)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Actualisation..."
            : "Actualiser"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Statut
          </p>

          <p className="mt-2 text-sm font-black text-white">
            {latest
              ? statusLabel(latest.status)
              : "NON PRÉPARÉ"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Readiness
          </p>

          <p className="mt-2 text-sm font-black text-white">
            {latest?.readiness?.score != null
              ? `${latest.readiness.score}/100`
              : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Historique
          </p>

          <p className="mt-2 text-sm font-black text-white">
            {deployments.length} déploiement(s)
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {latest?.status === "DEPLOYED" ? (
          <button
            type="button"
            disabled
            title="Cette version possède déjà un déploiement en production."
            className="cursor-not-allowed rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-200 opacity-80"
          >
            Version actuellement en production
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void prepareDeployment()}
            disabled={Boolean(action)}
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action === "prepare"
              ? "Préparation..."
              : "Préparer un déploiement"}
          </button>
        )}

        {latest?.status === "READY" &&
          !githubReady && (
            <button
              type="button"
              onClick={() =>
                void publishGitHub(latest.id)
              }
              disabled={Boolean(action)}
              className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === `github:${latest.id}`
                ? "Publication GitHub..."
                : "Publier sur GitHub"}
            </button>
          )}

        {latest?.status === "READY" &&
          githubReady && (
            <button
              type="button"
              onClick={() =>
                void deployVercel(latest.id)
              }
              disabled={Boolean(action)}
              className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === `vercel:${latest.id}`
                ? "Déploiement Vercel..."
                : "Déployer en production"}
            </button>
          )}

        {latest?.status === "DEPLOYED" &&
          productionUrl && (
            <button
              type="button"
              onClick={() =>
                void verifyProduction(latest.id)
              }
              disabled={Boolean(action)}
              className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === `verify:${latest.id}`
                ? "Vérification..."
                : "Vérifier la production"}
            </button>
          )}

        {latest?.status === "DEPLOYED" &&
          productionUrl && (
            <a
              href={productionUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400"
            >
              Ouvrir la production
            </a>
          )}

        {latest?.status === "DEPLOYED" && (
          <button
            type="button"
            onClick={() =>
              void prepareRollback(latest.id)
            }
            disabled={Boolean(action)}
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-5 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action === `rollback:${latest.id}`
              ? "Préparation rollback..."
              : "Préparer un rollback"}
          </button>
        )}
      </div>

      {productionVerification && (
        <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Santé de la production
              </p>

              <p className="mt-2 text-lg font-black text-white">
                {productionVerification.reachable
                  ? "PRODUCTION ACCESSIBLE"
                  : "PRODUCTION INACCESSIBLE"}
              </p>
            </div>

            <div className="rounded-lg bg-black/20 px-4 py-2 text-sm font-bold text-cyan-100">
              HTTP {productionVerification.status}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Temps de réponse
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {productionVerification.durationMs} ms
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Vérifié le
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {new Date(
                  productionVerification.checkedAt
                ).toLocaleString("fr-CA")}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Type de contenu
              </p>
              <p className="mt-1 break-all text-sm font-bold text-white">
                {productionVerification.contentType ||
                  "Non indiqué"}
              </p>
            </div>
          </div>
        </div>
      )}

      {latest && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              GitHub
            </p>

            <p className="mt-2 break-all text-sm text-slate-200">
              {latest.commitSha ||
                githubData?.commit ||
                "Pas encore publié"}
            </p>

            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-bold text-emerald-300 hover:text-emerald-200"
              >
                Ouvrir le dépôt GitHub →
              </a>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Production Vercel
            </p>

            <p className="mt-2 break-all text-sm text-slate-200">
              {productionUrl ||
                "Pas encore déployé"}
            </p>

            {productionUrl && (
              <a
                href={productionUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-bold text-blue-300 hover:text-blue-200"
              >
                Ouvrir le site public →
              </a>
            )}
          </div>
        </div>
      )}

      {rollbackPlan && (
        <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
            Plan de rollback prêt
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-100">
            Le plan a été préparé uniquement.
            Aucune restauration de production
            n'a été exécutée.
          </p>

          <div className="mt-4 grid gap-2 text-xs text-amber-100/80">
            <p>
              Version :{" "}
              <span className="font-mono">
                {rollbackPlan.versionId}
              </span>
            </p>

            <p>
              Fichiers du snapshot :{" "}
              {Array.isArray(rollbackPlan.files)
                ? rollbackPlan.files.length
                : 0}
            </p>
          </div>

          {latest?.status === "DEPLOYED" && (
            <button
              type="button"
              onClick={() =>
                void executeRollback(latest.id)
              }
              disabled={Boolean(action)}
              className="mt-4 rounded-xl border border-red-400/40 bg-red-500/20 px-5 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action ===
              `execute-rollback:${latest.id}`
                ? "Rollback en cours..."
                : "Exécuter le rollback"}
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Historique des déploiements
        </p>

        {loading && deployments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Chargement...
          </p>
        ) : deployments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Aucun déploiement préparé.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {deployments.map((deployment) => {
              const url =
                deployment.productionUrl ||
                deployment.deploymentUrl;

              return (
                <div
                  key={deployment.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      {statusLabel(
                        deployment.status
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(
                        deployment.createdAt
                      ).toLocaleString()}
                    </p>

                    {deployment.error && (
                      <p className="mt-2 text-xs text-red-300">
                        {deployment.error}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {deployment.readiness?.score != null && (
                      <span className="text-xs font-bold text-slate-300">
                        {
                          deployment.readiness
                            .score
                        }
                        /100
                      </span>
                    )}

                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-300 hover:text-blue-200"
                      >
                        Production →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
