import {
  diagnoseProductionProject,
} from "./diagnostics";

import type {
  DeploymentTarget,
  ProductionPlan,
  ProductionProjectSnapshot,
  RollbackPlan,
} from "./types";

function detectTarget(
  project: ProductionProjectSnapshot
): DeploymentTarget {
  const packageFile =
    project.files.find(
      (file) =>
        file.path.replace(/^\.?\//, "") ===
        "package.json"
    );

  let framework:
    | "nextjs"
    | "unknown" = "unknown";

  let buildCommand = "npm run build";

  if (packageFile) {
    try {
      const packageJson = JSON.parse(
        packageFile.content
      ) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<
          string,
          string
        >;
      };

      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      if (dependencies.next) {
        framework = "nextjs";
      }

      if (packageJson.scripts?.build) {
        buildCommand = "npm run build";
      }
    } catch {
      // Le diagnostic signalera le JSON invalide.
    }
  }

  return {
    provider: "vercel",
    projectName: project.projectName,
    framework,
    buildCommand,
    installCommand: "npm install",
    outputDirectory: null,
  };
}

function createRollbackPlan(
  project: ProductionProjectSnapshot
): RollbackPlan {
  if (project.versionId) {
    return {
      supported: true,
      projectId: project.projectId,
      versionId: project.versionId,
      strategy: "project-version",
      message:
        "Une version CreatorBusinessAI est disponible comme point de restauration avant déploiement.",
    };
  }

  return {
    supported: false,
    projectId: project.projectId,
    versionId: null,
    strategy: "none",
    message:
      "Créez une version du projet avant le premier déploiement afin d'activer un rollback sûr.",
  };
}

export function createProductionPlan(
  project: ProductionProjectSnapshot
): ProductionPlan {
  return {
    project,
    readiness:
      diagnoseProductionProject(project),
    target: detectTarget(project),
    rollback: createRollbackPlan(project),
    generatedAt:
      new Date().toISOString(),
  };
}
