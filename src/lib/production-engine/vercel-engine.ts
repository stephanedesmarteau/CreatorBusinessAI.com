import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

import {
  getDeployment,
  getRollbackTarget,
  transitionDeployment,
} from "./deployment-service";

type SnapshotFile = {
  path: string;
  content: string;
};

export type VercelDryRunResult = {
  deploymentId: string;
  projectId: string;
  projectName: string;
  fileCount: number;
  command: string[];
  stdout: string;
  stderr: string;
};

const FORBIDDEN_PATTERNS = [
  /^\.env(?:\.|$)/i,
  /(?:^|\/)\.env(?:\.|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /credentials?/i,
  /secrets?\.(?:json|ya?ml|txt)$/i,
];

function normalizeSnapshot(
  value: unknown
): SnapshotFile[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Le snapshot du déploiement est invalide."
    );
  }

  const seen = new Set<string>();

  return value.map((entry, index) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    ) {
      throw new Error(
        `Entrée snapshot invalide à l'index ${index}.`
      );
    }

    const record =
      entry as Record<string, unknown>;

    const path =
      typeof record.path === "string"
        ? record.path.trim()
        : "";

    const content =
      typeof record.content === "string"
        ? record.content
        : null;

    if (!path || content === null) {
      throw new Error(
        `Fichier snapshot incomplet à l'index ${index}.`
      );
    }

    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").includes("..")
    ) {
      throw new Error(
        `Chemin interdit : ${path}`
      );
    }

    if (
      FORBIDDEN_PATTERNS.some(
        (pattern) => pattern.test(path)
      )
    ) {
      throw new Error(
        `Fichier sensible refusé : ${path}`
      );
    }

    if (seen.has(path)) {
      throw new Error(
        `Chemin dupliqué dans le snapshot : ${path}`
      );
    }

    seen.add(path);

    return {
      path,
      content,
    };
  });
}

function assertInsideRoot(
  root: string,
  destination: string
) {
  const normalizedRoot =
    resolve(root) + sep;

  const normalizedDestination =
    resolve(destination);

  if (
    !normalizedDestination.startsWith(
      normalizedRoot
    )
  ) {
    throw new Error(
      `Écriture hors du dossier temporaire refusée : ${destination}`
    );
  }
}

async function materializeSnapshot(
  files: SnapshotFile[]
) {
  const root = await mkdtemp(
    join(
      tmpdir(),
      "creatorbusinessai-vercel-"
    )
  );

  try {
    for (const file of files) {
      const destination =
        join(root, file.path);

      assertInsideRoot(
        root,
        destination
      );

      await mkdir(
        dirname(destination),
        {
          recursive: true,
        }
      );

      await writeFile(
        destination,
        file.content,
        "utf8"
      );
    }

    return root;
  } catch (error) {
    await rm(
      root,
      {
        recursive: true,
        force: true,
      }
    ).catch(() => undefined);

    throw error;
  }
}

function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return new Promise(
    (resolvePromise, rejectPromise) => {
      const child = spawn(
        command,
        args,
        {
          cwd,
          env: process.env,
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on(
        "data",
        (chunk) => {
          stdout += chunk;
        }
      );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr += chunk;
        }
      );

      child.on(
        "error",
        rejectPromise
      );

      child.on(
        "close",
        (code) => {
          if (code === 0) {
            resolvePromise({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            });

            return;
          }

          rejectPromise(
            new Error(
              [
                `Commande terminée avec le code ${code}.`,
                stderr.trim(),
                stdout.trim(),
              ]
                .filter(Boolean)
                .join("\n")
            )
          );
        }
      );
    }
  );
}

export async function prepareVercelDryRun(
  workspaceId: string,
  deploymentId: string
): Promise<VercelDryRunResult> {
  const deployment =
    await getDeployment(
      workspaceId,
      deploymentId
    );

  if (!deployment) {
    throw new Error(
      "Déploiement introuvable."
    );
  }

  if (deployment.status !== "READY") {
    throw new Error(
      `Le déploiement doit être READY. Statut actuel : ${deployment.status}.`
    );
  }

  if (!deployment.commitSha) {
    throw new Error(
      "Le snapshot doit d'abord être publié sur GitHub."
    );
  }

  const files =
    normalizeSnapshot(
      deployment.sourceSnapshot
    );

  if (files.length === 0) {
    throw new Error(
      "Le snapshot ne contient aucun fichier."
    );
  }

  const root =
    await materializeSnapshot(files);

  const args = [
    "vercel@latest",
    "deploy",
    "--dry",
    "--json",
    "--yes",
    "--project",
    deployment.project.name,
    "--scope",
    "stephanedesmarteau02-1425s-projects",
  ];

  try {
    const result =
      await runCommand(
        "npx",
        args,
        root
      );

    return {
      deploymentId:
        deployment.id,
      projectId:
        deployment.projectId,
      projectName:
        deployment.project.name,
      fileCount:
        files.length,
      command: [
        "npx",
        ...args,
      ],
      stdout:
        result.stdout,
      stderr:
        result.stderr,
    };
  } finally {
    await rm(
      root,
      {
        recursive: true,
        force: true,
      }
    ).catch(() => undefined);
  }
}


export type VercelProductionResult = {
  deploymentId: string;
  projectId: string;
  projectName: string;
  fileCount: number;
  status: "DEPLOYED";
  deploymentUrl: string;
  productionUrl: string;
  stdout: string;
  stderr: string;
};

function extractVercelUrl(
  stdout: string
): string {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new Error(
      "Vercel n'a retourné aucune URL de déploiement."
    );
  }

  try {
    const parsed = JSON.parse(trimmed);

    const candidates = [
      parsed?.url,
      parsed?.deploymentUrl,
      parsed?.productionUrl,
      parsed?.alias,
      parsed?.aliases?.[0],
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        const value = candidate.trim();

        return value.startsWith("http")
          ? value
          : `https://${value}`;
      }
    }
  } catch {
    // Le CLI peut aussi retourner l'URL en texte brut.
  }

  const match = trimmed.match(
    /https:\/\/[^\s"'<>]+/
  );

  if (match) {
    return match[0];
  }

  throw new Error(
    "Impossible d'extraire l'URL retournée par Vercel."
  );
}

const VERCEL_SCOPE =
  "stephanedesmarteau02-1425s-projects";

async function ensureVercelProject(
  projectName: string,
  cwd: string
) {
  let created = false;

  try {
    await runCommand(
      "npx",
      [
        "vercel@latest",
        "project",
        "inspect",
        projectName,
        "--scope",
        VERCEL_SCOPE,
      ],
      cwd
    );
  } catch (error) {
    const message = String(error);

    if (
      !message.includes("was not found") &&
      !message.includes("not found")
    ) {
      throw error;
    }

    await runCommand(
      "npx",
      [
        "vercel@latest",
        "project",
        "add",
        projectName,
        "--scope",
        VERCEL_SCOPE,
      ],
      cwd
    );

    created = true;
  }

  await runCommand(
    "npx",
    [
      "vercel@latest",
      "project",
      "update",
      projectName,
      "--framework",
      "nextjs",
      "--auto-detect",
      "output-directory",
      "--yes",
      "--scope",
      VERCEL_SCOPE,
    ],
    cwd
  );

  return { created };
}

export async function deployToVercelProduction(
  workspaceId: string,
  deploymentId: string
): Promise<VercelProductionResult> {
  if (process.env.CREATORBUSINESSAI_VERCEL_PRODUCTION_ENABLED !== "true") {
    throw new Error(
      "Déploiement Vercel en production désactivé : vérification de sécurité requise."
    );
  }

  const deployment =
    await getDeployment(
      workspaceId,
      deploymentId
    );

  if (!deployment) {
    throw new Error(
      "Déploiement introuvable."
    );
  }

  if (deployment.status !== "READY") {
    throw new Error(
      `Le déploiement doit être READY. Statut actuel : ${deployment.status}.`
    );
  }

  if (!deployment.commitSha) {
    throw new Error(
      "Le snapshot doit d'abord être publié sur GitHub."
    );
  }

  const files =
    normalizeSnapshot(
      deployment.sourceSnapshot
    );

  if (files.length === 0) {
    throw new Error(
      "Le snapshot ne contient aucun fichier."
    );
  }

  const root =
    await materializeSnapshot(files);

  const vercelProject =
    await ensureVercelProject(
      deployment.project.name,
      root
    );

  const existingProviderData =
    deployment.providerData &&
    typeof deployment.providerData === "object" &&
    !Array.isArray(deployment.providerData)
      ? deployment.providerData as Record<string, unknown>
      : {};

  await transitionDeployment(
    workspaceId,
    deploymentId,
    "DEPLOYING",
    {
      error: null,
      providerData: {
        ...existingProviderData,
        vercel: {
          projectName:
            deployment.project.name,
          scope:
            "stephanedesmarteau02-1425s-projects",
          framework:
            "nextjs",
          projectCreated:
            vercelProject.created,
          startedAt:
            new Date().toISOString(),
        },
      },
    }
  );

  const args = [
    "vercel@latest",
    "deploy",
    "--prod",
    "--yes",
    "--json",
    "--project",
    deployment.project.name,
    "--scope",
    "stephanedesmarteau02-1425s-projects",
  ];

  try {
    const result =
      await runCommand(
        "npx",
        args,
        root
      );

    const deploymentUrl =
      extractVercelUrl(
        result.stdout
      );

    const finalDeployment =
      await transitionDeployment(
        workspaceId,
        deploymentId,
        "DEPLOYED",
        {
          deploymentUrl,
          productionUrl:
            deploymentUrl,
          error: null,
          logs: {
            stdout:
              result.stdout.slice(-100000),
            stderr:
              result.stderr.slice(-100000),
          },
          providerData: {
            ...existingProviderData,
            vercel: {
              projectName:
                deployment.project.name,
              scope:
                "stephanedesmarteau02-1425s-projects",
              framework:
                "nextjs",
              deploymentUrl,
              productionUrl:
                deploymentUrl,
              deployedAt:
                new Date().toISOString(),
              fileCount:
                files.length,
            },
          },
        }
      );

    return {
      deploymentId:
        finalDeployment.id,
      projectId:
        finalDeployment.projectId,
      projectName:
        deployment.project.name,
      fileCount:
        files.length,
      status:
        "DEPLOYED",
      deploymentUrl,
      productionUrl:
        deploymentUrl,
      stdout:
        result.stdout,
      stderr:
        result.stderr,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    await transitionDeployment(
      workspaceId,
      deploymentId,
      "FAILED",
      {
        error:
          message.slice(0, 20000),
        logs: {
          error:
            message.slice(0, 100000),
        },
        providerData: {
          ...existingProviderData,
          vercel: {
            projectName:
              deployment.project.name,
            scope:
              "stephanedesmarteau02-1425s-projects",
            framework:
              "nextjs",
            failedAt:
              new Date().toISOString(),
          },
        },
      }
    ).catch(() => undefined);

    throw error;
  } finally {
    await rm(
      root,
      {
        recursive: true,
        force: true,
      }
    ).catch(() => undefined);
  }
}


export async function rollbackVercelProduction(
  workspaceId: string,
  deploymentId: string
): Promise<VercelProductionResult> {
  if (process.env.CREATORBUSINESSAI_VERCEL_PRODUCTION_ENABLED !== "true") {
    throw new Error(
      "Déploiement Vercel en production désactivé : vérification de sécurité requise."
    );
  }

  const {
    deployment,
    targetDeployment,
    targetVersion,
  } = await getRollbackTarget(
    workspaceId,
    deploymentId
  );

  if (
    targetVersion.id ===
    deployment.projectVersion?.id
  ) {
    throw new Error(
      "Rollback refusé : la version cible est identique à la version actuellement en production."
    );
  }

  const files =
    normalizeSnapshot(
      targetVersion.files
    );

  if (files.length === 0) {
    throw new Error(
      "Le snapshot de rollback ne contient aucun fichier."
    );
  }

  const root =
    await materializeSnapshot(files);

  const existingProviderData =
    deployment.providerData &&
    typeof deployment.providerData === "object" &&
    !Array.isArray(deployment.providerData)
      ? deployment.providerData as Record<
          string,
          unknown
        >
      : {};

  await transitionDeployment(
    workspaceId,
    deploymentId,
    "ROLLING_BACK",
    {
      error: null,
      providerData: {
        ...existingProviderData,
        rollback: {
          targetDeploymentId:
            targetDeployment.id,
          versionId:
            targetVersion.id,
          targetVersionId:
            targetVersion.id,
          startedAt:
            new Date().toISOString(),
          fileCount:
            files.length,
        },
      },
    }
  );

  const args = [
    "vercel@latest",
    "deploy",
    "--prod",
    "--yes",
    "--json",
    "--project",
    deployment.project.name,
    "--scope",
    "stephanedesmarteau02-1425s-projects",
  ];

  try {
    const result =
      await runCommand(
        "npx",
        args,
        root
      );

    const deploymentUrl =
      extractVercelUrl(
        result.stdout
      );

    const finalDeployment =
      await transitionDeployment(
        workspaceId,
        deploymentId,
        "ROLLED_BACK",
        {
          deploymentUrl,
          productionUrl:
            deploymentUrl,
          error: null,
          logs: {
            stdout:
              result.stdout.slice(-100000),
            stderr:
              result.stderr.slice(-100000),
          },
          providerData: {
            ...existingProviderData,
            rollback: {
              targetDeploymentId:
                targetDeployment.id,
              versionId:
                targetVersion.id,
              targetVersionId:
                targetVersion.id,
              deploymentUrl,
              productionUrl:
                deploymentUrl,
              completedAt:
                new Date().toISOString(),
              fileCount:
                files.length,
            },
          },
        }
      );

    return {
      deploymentId:
        finalDeployment.id,
      projectId:
        finalDeployment.projectId,
      projectName:
        deployment.project.name,
      fileCount:
        files.length,
      status:
        "DEPLOYED",
      deploymentUrl,
      productionUrl:
        deploymentUrl,
      stdout:
        result.stdout,
      stderr:
        result.stderr,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    await transitionDeployment(
      workspaceId,
      deploymentId,
      "FAILED",
      {
        error:
          message.slice(0, 20000),
        logs: {
          error:
            message.slice(0, 100000),
        },
        providerData: {
          ...existingProviderData,
          rollback: {
            targetDeploymentId:
              targetDeployment.id,
            versionId:
              targetVersion.id,
            targetVersionId:
              targetVersion.id,
            failedAt:
              new Date().toISOString(),
          },
        },
      }
    ).catch(() => undefined);

    throw error;
  } finally {
    await rm(
      root,
      {
        recursive: true,
        force: true,
      }
    ).catch(() => undefined);
  }
}
