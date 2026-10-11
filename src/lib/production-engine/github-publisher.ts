import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import { prisma } from "@/lib/db/prisma";
import { getDeployment } from "./deployment-service";

const execFileAsync = promisify(execFile);

const FORBIDDEN_PATH_PATTERNS = [
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

export type GitHubPublishPreparation = {
  deploymentId: string;
  projectId: string;
  projectName: string;
  owner: string;
  repository: string;
  fullName: string;
  branch: "main";
  description: string;
  private: boolean;
  files: Array<{
    path: string;
    content: string;
  }>;
  fileCount: number;
};

export type GitHubPublishResult = {
  deploymentId: string;
  repository: string;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  created: boolean;
  fileCount: number;
};

function normalizeRepositoryName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90);

  if (!normalized) {
    throw new Error(
      "Impossible de déterminer le nom du dépôt GitHub."
    );
  }

  return normalized;
}

function normalizeSnapshot(
  value: unknown
): Array<{ path: string; content: string }> {
  if (!Array.isArray(value)) {
    throw new Error(
      "Le snapshot du déploiement est invalide."
    );
  }

  return value.map((entry, index) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    ) {
      throw new Error(
        `Fichier snapshot invalide à l'index ${index}.`
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
        `Chemin interdit dans le snapshot : ${path}`
      );
    }

    if (
      FORBIDDEN_PATH_PATTERNS.some(
        (pattern) => pattern.test(path)
      )
    ) {
      throw new Error(
        `Fichier sensible refusé : ${path}`
      );
    }

    return {
      path,
      content,
    };
  });
}

async function runGh(
  args: string[]
) {
  const result = await execFileAsync(
    "gh",
    args,
    {
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    }
  );

  return {
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
}

function runGhWithInput(
  args: string[],
  input: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "gh",
      args,
      {
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          stderr.trim() ||
          `gh a terminé avec le code ${code}.`
        )
      );
    });

    child.stdin.end(input);
  });
}

async function getGitHubLogin() {
  const result = await runGh([
    "api",
    "user",
    "--jq",
    ".login",
  ]);

  if (!result.stdout) {
    throw new Error(
      "Impossible de déterminer l'utilisateur GitHub."
    );
  }

  return result.stdout;
}

async function repositoryExists(
  owner: string,
  repository: string
) {
  try {
    await runGh([
      "api",
      `repos/${owner}/${repository}`,
      "--silent",
    ]);

    return true;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (/HTTP 404|status 404/i.test(message)) {
      return false;
    }

    throw new Error(
      "Impossible de vérifier le dépôt GitHub. Publication interrompue.",
      { cause: error }
    );
  }
}

async function createRepository(
  owner: string,
  repository: string,
  description: string,
  isPrivate: boolean
) {
  const visibilityFlag =
    isPrivate ? "--private" : "--public";

  await runGh([
    "repo",
    "create",
    `${owner}/${repository}`,
    visibilityFlag,
    "--description",
    description,
  ]);
}

async function initializeEmptyRepository(
  owner: string,
  repository: string,
  branch: string,
  files: Array<{
    path: string;
    content: string;
  }>
) {
  if (files.length === 0) {
    throw new Error(
      "Impossible d'initialiser un dépôt sans fichiers."
    );
  }

  const firstFile = files[0];

  const result = await runGh([
    "api",
    "--method",
    "PUT",
    `repos/${owner}/${repository}/contents/${firstFile.path}`,
    "-f",
    `message=Initial commit from CreatorBusinessAI`,
    "-f",
    `content=${Buffer.from(
      firstFile.content,
      "utf8"
    ).toString("base64")}`,
    "-f",
    `branch=${branch}`,
    "--jq",
    ".commit.sha",
  ]);

  if (!result.stdout) {
    throw new Error(
      "GitHub n'a pas retourné le SHA du premier commit."
    );
  }

  return result.stdout;
}

async function getBranchHead(
  owner: string,
  repository: string,
  branch: string
) {
  try {
    const result = await runGh([
      "api",
      `repos/${owner}/${repository}/git/ref/heads/${branch}`,
      "--jq",
      ".object.sha",
    ]);

    return result.stdout || null;
  } catch {
    return null;
  }
}

async function createBlob(
  owner: string,
  repository: string,
  content: string
) {
  const encoded =
    Buffer.from(content, "utf8").toString("base64");

  const result = await runGh([
    "api",
    "--method",
    "POST",
    `repos/${owner}/${repository}/git/blobs`,
    "-f",
    `content=${encoded}`,
    "-f",
    "encoding=base64",
    "--jq",
    ".sha",
  ]);

  return result.stdout;
}

async function createTree(
  owner: string,
  repository: string,
  files: Array<{
    path: string;
    content: string;
  }>
) {
  const tree = [];

  for (const file of files) {
    const sha = await createBlob(
      owner,
      repository,
      file.content
    );

    tree.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha,
    });
  }

  const result = await runGh([
    "api",
    "--method",
    "POST",
    `repos/${owner}/${repository}/git/trees`,
    "--input",
    "-",
    "--jq",
    ".sha",
  ]);

  return {
    tree,
    placeholderTreeSha: result.stdout,
  };
}

async function createTreeFromEntries(
  owner: string,
  repository: string,
  entries: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
  }>
) {
  const payload = JSON.stringify({
    tree: entries,
  });

  return runGhWithInput(
    [
      "api",
      "--method",
      "POST",
      `repos/${owner}/${repository}/git/trees`,
      "--input",
      "-",
      "--jq",
      ".sha",
    ],
    payload
  );
}

async function createCommit(
  owner: string,
  repository: string,
  treeSha: string,
  parentSha: string | null,
  message: string
) {
  const payload: {
    message: string;
    tree: string;
    parents?: string[];
  } = {
    message,
    tree: treeSha,
  };

  if (parentSha) {
    payload.parents = [parentSha];
  }

  return runGhWithInput(
    [
      "api",
      "--method",
      "POST",
      `repos/${owner}/${repository}/git/commits`,
      "--input",
      "-",
      "--jq",
      ".sha",
    ],
    JSON.stringify(payload)
  );
}

async function updateBranch(
  owner: string,
  repository: string,
  branch: string,
  commitSha: string,
  branchExists: boolean
) {
  if (branchExists) {
    await runGh([
      "api",
      "--method",
      "PATCH",
      `repos/${owner}/${repository}/git/refs/heads/${branch}`,
      "-f",
      `sha=${commitSha}`,
      "-F",
      "force=false",
    ]);

    return;
  }

  await runGh([
    "api",
    "--method",
    "POST",
    `repos/${owner}/${repository}/git/refs`,
    "-f",
    `ref=refs/heads/${branch}`,
    "-f",
    `sha=${commitSha}`,
  ]);
}

export async function prepareGitHubPublication(
  workspaceId: string,
  deploymentId: string,
  options?: {
    owner?: string;
    repository?: string;
    private?: boolean;
  }
): Promise<GitHubPublishPreparation> {
  const deployment = await getDeployment(
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
      `Le déploiement doit être READY avant publication GitHub. Statut actuel : ${deployment.status}.`
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

  const owner =
    options?.owner?.trim() ||
    await getGitHubLogin();

  const repository =
    normalizeRepositoryName(
      options?.repository ||
      deployment.project.name
    );

  return {
    deploymentId: deployment.id,
    projectId: deployment.projectId,
    projectName: deployment.project.name,
    owner,
    repository,
    fullName: `${owner}/${repository}`,
    branch: "main",
    description:
      `Application générée par CreatorBusinessAI — ${deployment.project.name}`,
    private: options?.private ?? true,
    files,
    fileCount: files.length,
  };
}

export async function publishDeploymentToGitHub(
  workspaceId: string,
  deploymentId: string,
  options?: {
    owner?: string;
    repository?: string;
    private?: boolean;
    allowExistingRepository?: boolean;
  }
): Promise<GitHubPublishResult> {
  if (process.env.CREATORBUSINESSAI_GITHUB_PUBLISH_ENABLED !== "true") {
    throw new Error(
      "Publication GitHub désactivée : vérification de sécurité requise."
    );
  }

  const preparation =
    await prepareGitHubPublication(
      workspaceId,
      deploymentId,
      options
    );

  const exists =
    await repositoryExists(
      preparation.owner,
      preparation.repository
    );

  if (exists) {
    throw new Error(
      `Le dépôt ${preparation.fullName} existe déjà. Publication refusée pour éviter un écrasement accidentel.`
    );
  }

  let created = false;

  if (!exists) {
    await createRepository(
      preparation.owner,
      preparation.repository,
      preparation.description,
      preparation.private
    );

    created = true;
  }

  let parentSha =
    await getBranchHead(
      preparation.owner,
      preparation.repository,
      preparation.branch
    );

  if (!parentSha) {
    parentSha =
      await initializeEmptyRepository(
        preparation.owner,
        preparation.repository,
        preparation.branch,
        preparation.files
      );
  }

  const treeEntries = [];

  for (const file of preparation.files) {
    const sha = await createBlob(
      preparation.owner,
      preparation.repository,
      file.content
    );

    treeEntries.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha,
    });
  }

  const treeSha =
    await createTreeFromEntries(
      preparation.owner,
      preparation.repository,
      treeEntries
    );

  const commitSha =
    await createCommit(
      preparation.owner,
      preparation.repository,
      treeSha,
      parentSha,
      `Deploy ${preparation.projectName} from CreatorBusinessAI`
    );

  await updateBranch(
    preparation.owner,
    preparation.repository,
    preparation.branch,
    commitSha,
    Boolean(parentSha)
  );

  const repositoryUrl =
    `https://github.com/${preparation.fullName}`;

  const current =
    await prisma.deployment.findUnique({
      where: {
        id: deploymentId,
      },
      select: {
        providerData: true,
      },
    });

  const previousProviderData =
    current?.providerData &&
    typeof current.providerData === "object" &&
    !Array.isArray(current.providerData)
      ? current.providerData
      : {};

  await prisma.deployment.update({
    where: {
      id: deploymentId,
    },
    data: {
      commitSha,
      providerData: JSON.parse(
        JSON.stringify({
          ...previousProviderData,
          github: {
            owner: preparation.owner,
            repository:
              preparation.repository,
            fullName:
              preparation.fullName,
            repositoryUrl,
            branch:
              preparation.branch,
            commitSha,
            fileCount:
              preparation.fileCount,
            publishedAt:
              new Date().toISOString(),
          },
        })
      ),
    },
  });

  return {
    deploymentId,
    repository:
      preparation.fullName,
    repositoryUrl,
    branch:
      preparation.branch,
    commitSha,
    created,
    fileCount:
      preparation.fileCount,
  };
}
