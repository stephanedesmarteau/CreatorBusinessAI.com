import { prisma } from "@/lib/db/prisma";
import { createProductionPlan } from "./planner";
import { loadProductionProject } from "./project-loader";

type DeploymentStatus =
  | "PREPARING"
  | "READY"
  | "DEPLOYING"
  | "DEPLOYED"
  | "FAILED"
  | "ROLLING_BACK"
  | "ROLLED_BACK";

const TRANSITIONS: Record<DeploymentStatus, DeploymentStatus[]> = {
  PREPARING: ["READY", "FAILED"],
  READY: ["DEPLOYING", "FAILED"],
  DEPLOYING: ["DEPLOYED", "FAILED"],
  DEPLOYED: ["ROLLING_BACK"],
  FAILED: [],
  ROLLING_BACK: ["ROLLED_BACK", "FAILED"],
  ROLLED_BACK: [],
};

function snapshotFiles(
  files: Array<{ path: string; content: string }>
) {
  return files.map((file) => ({
    path: file.path,
    content: file.content,
  }));
}

function snapshotFingerprint(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .filter(
      (
        file
      ): file is {
        path: string;
        content: string;
      } =>
        Boolean(file) &&
        typeof file === "object" &&
        typeof (file as { path?: unknown }).path ===
          "string" &&
        typeof (file as { content?: unknown }).content ===
          "string"
    )
    .map((file) => ({
      path: file.path,
      content: file.content,
    }))
    .sort((a, b) =>
      a.path.localeCompare(b.path)
    );

  return JSON.stringify(normalized);
}

export async function prepareDeployment(
  workspaceId: string,
  projectId: string
) {
  const project = await loadProductionProject(
    workspaceId,
    projectId
  );

  if (!project) {
    throw new Error(
      "Projet introuvable ou accès interdit."
    );
  }

  const plan = createProductionPlan(project);

  if (!plan.readiness.ready) {
    throw new Error(
      `Projet non prêt pour la production : ${plan.readiness.errors} erreur(s).`
    );
  }

  const files = snapshotFiles(project.files);

  const latestProduction =
    await prisma.deployment.findFirst({
      where: {
        workspaceId,
        projectId,
        environment: "production",
        status: "DEPLOYED",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        sourceSnapshot: true,
        productionUrl: true,
        deploymentUrl: true,
      },
    });

  if (
    latestProduction &&
    snapshotFingerprint(
      latestProduction.sourceSnapshot
    ) === snapshotFingerprint(files)
  ) {
    throw new Error(
      "Cette version du projet est déjà en production. Aucun nouveau déploiement n’a été créé."
    );
  }

  const version = await prisma.projectVersion.create({
    data: {
      projectId,
      label: `Production ${new Date().toISOString()}`,
      description:
        "Snapshot automatique créé par le Production Engine avant déploiement.",
      files,
    },
  });

  try {
    const deployment = await prisma.deployment.create({
      data: {
        workspaceId,
        projectId,
        projectVersionId: version.id,
        provider: plan.target.provider,
        environment: "production",
        status: "READY",
        sourceSnapshot: files,
        readiness: JSON.parse(
          JSON.stringify(plan.readiness)
        ),
        providerData: {
          target: plan.target,
          generatedAt: plan.generatedAt,
        },
      },
      include: {
        projectVersion: true,
      },
    });

    return {
      deployment,
      plan: {
        ...plan,
        project: {
          ...plan.project,
          versionId: version.id,
        },
        rollback: {
          supported: true,
          projectId,
          versionId: version.id,
          strategy: "project-version" as const,
          message:
            "Rollback disponible vers le snapshot de production.",
        },
      },
    };
  } catch (error) {
    await prisma.projectVersion.delete({
      where: {
        id: version.id,
      },
    }).catch(() => undefined);

    throw error;
  }
}

export async function listDeployments(
  workspaceId: string,
  projectId: string
) {
  return prisma.deployment.findMany({
    where: {
      workspaceId,
      projectId,
    },
    include: {
      projectVersion: {
        select: {
          id: true,
          label: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getDeployment(
  workspaceId: string,
  deploymentId: string
) {
  return prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      workspaceId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      projectVersion: true,
    },
  });
}

export async function transitionDeployment(
  workspaceId: string,
  deploymentId: string,
  nextStatus: DeploymentStatus,
  data?: {
    productionUrl?: string | null;
    deploymentUrl?: string | null;
    commitSha?: string | null;
    providerData?: unknown;
    logs?: unknown;
    error?: string | null;
  }
) {
  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      workspaceId,
    },
  });

  if (!deployment) {
    throw new Error("Déploiement introuvable.");
  }

  const current =
    deployment.status as DeploymentStatus;

  if (!TRANSITIONS[current].includes(nextStatus)) {
    throw new Error(
      `Transition interdite : ${current} → ${nextStatus}.`
    );
  }

  const now = new Date();

  return prisma.deployment.update({
    where: {
      id: deployment.id,
    },
    data: {
      status: nextStatus,
      productionUrl:
        data?.productionUrl === undefined
          ? deployment.productionUrl
          : data.productionUrl,
      deploymentUrl:
        data?.deploymentUrl === undefined
          ? deployment.deploymentUrl
          : data.deploymentUrl,
      commitSha:
        data?.commitSha === undefined
          ? deployment.commitSha
          : data.commitSha,
      providerData:
        data?.providerData === undefined
          ? undefined
          : JSON.parse(
              JSON.stringify(data.providerData)
            ),
      logs:
        data?.logs === undefined
          ? undefined
          : JSON.parse(
              JSON.stringify(data.logs)
            ),
      error:
        data?.error === undefined
          ? deployment.error
          : data.error,
      startedAt:
        nextStatus === "DEPLOYING"
          ? now
          : deployment.startedAt,
      completedAt:
        nextStatus === "DEPLOYED" ||
        nextStatus === "FAILED"
          ? now
          : deployment.completedAt,
      rolledBackAt:
        nextStatus === "ROLLED_BACK"
          ? now
          : deployment.rolledBackAt,
    },
  });
}

export async function getRollbackTarget(
  workspaceId: string,
  deploymentId: string
) {
  const deployment = await getDeployment(
    workspaceId,
    deploymentId
  );

  if (!deployment) {
    throw new Error(
      "Déploiement introuvable."
    );
  }

  if (deployment.status !== "DEPLOYED") {
    throw new Error(
      "Seul un déploiement DEPLOYED peut être préparé pour rollback."
    );
  }

  const previousDeployment =
    await prisma.deployment.findFirst({
      where: {
        workspaceId,
        projectId: deployment.projectId,
        environment: "production",
        createdAt: {
          lt: deployment.createdAt,
        },
        status: {
          in: [
            "DEPLOYED",
            "ROLLED_BACK",
          ],
        },
        projectVersionId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        projectVersion: true,
      },
    });

  if (
    !previousDeployment ||
    !previousDeployment.projectVersion
  ) {
    throw new Error(
      "Aucune version de production précédente disponible pour ce rollback."
    );
  }

  return {
    deployment,
    targetDeployment:
      previousDeployment,
    targetVersion:
      previousDeployment.projectVersion,
  };
}

export async function prepareRollback(
  workspaceId: string,
  deploymentId: string
) {
  const {
    deployment,
    targetDeployment,
    targetVersion,
  } = await getRollbackTarget(
    workspaceId,
    deploymentId
  );

  return {
    supported: true,
    deploymentId: deployment.id,
    projectId: deployment.projectId,
    currentVersionId:
      deployment.projectVersion?.id ?? null,
    targetDeploymentId:
      targetDeployment.id,
    versionId:
      targetVersion.id,
    targetVersionId:
      targetVersion.id,
    files:
      targetVersion.files,
    strategy:
      "previous-production-version" as const,
    message:
      "Version de production précédente disponible. Aucune restauration n'a encore été exécutée.",
  };
}
