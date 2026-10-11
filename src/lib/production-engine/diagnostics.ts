import type {
  DeploymentReadiness,
  EnvironmentRequirement,
  ProductionCheck,
  ProductionFile,
  ProductionProjectSnapshot,
} from "./types";

const ENV_PATTERNS = [
  /process\.env\.([A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g,
];

const SECRET_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /\.pem$/,
  /\.key$/,
];

const REQUIRED_NEXT_FILES = [
  "package.json",
];

function normalizePath(path: string) {
  return path.replace(/^\.?\//, "");
}

function findFile(
  files: ProductionFile[],
  path: string
) {
  const normalized = normalizePath(path);

  return files.find(
    (file) =>
      normalizePath(file.path) === normalized
  );
}

function detectEnvironment(
  files: ProductionFile[]
): EnvironmentRequirement[] {
  const found = new Map<
    string,
    Set<string>
  >();

  for (const file of files) {
    for (const pattern of ENV_PATTERNS) {
      pattern.lastIndex = 0;

      let match: RegExpExecArray | null;

      while (
        (match = pattern.exec(file.content)) !==
        null
      ) {
        const key = match[1];

        if (!found.has(key)) {
          found.set(key, new Set());
        }

        found.get(key)?.add(file.path);
      }
    }
  }

  return Array.from(found.entries())
    .map(([key, sourceFiles]) => ({
      key,
      required: true,
      detected: true,
      sourceFiles:
        Array.from(sourceFiles).sort(),
    }))
    .sort((a, b) =>
      a.key.localeCompare(b.key)
    );
}

function hasSecretFiles(
  files: ProductionFile[]
) {
  return files.filter((file) => {
    const path = normalizePath(file.path);
    const name =
      path.split("/").pop() || path;

    return SECRET_FILE_PATTERNS.some(
      (pattern) => pattern.test(name)
    );
  });
}

export function diagnoseProductionProject(
  project: ProductionProjectSnapshot
): DeploymentReadiness {
  const checks: ProductionCheck[] = [];

  if (project.files.length > 0) {
    checks.push({
      id: "files-present",
      label: "Fichiers du projet",
      status: "passed",
      message: `${project.files.length} fichier(s) prêt(s) pour l'analyse.`,
      blocking: false,
    });
  } else {
    checks.push({
      id: "files-present",
      label: "Fichiers du projet",
      status: "failed",
      message:
        "Le projet ne contient aucun fichier déployable.",
      blocking: true,
    });
  }

  for (const requiredFile of REQUIRED_NEXT_FILES) {
    const exists = Boolean(
      findFile(project.files, requiredFile)
    );

    checks.push({
      id: `required-${requiredFile}`,
      label: requiredFile,
      status: exists ? "passed" : "failed",
      message: exists
        ? `${requiredFile} est présent.`
        : `${requiredFile} est requis pour préparer le déploiement.`,
      blocking: !exists,
    });
  }

  const packageFile = findFile(
    project.files,
    "package.json"
  );

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

      const hasBuild =
        Boolean(packageJson.scripts?.build);

      checks.push({
        id: "build-script",
        label: "Commande de build",
        status: hasBuild
          ? "passed"
          : "failed",
        message: hasBuild
          ? `Build détecté : ${packageJson.scripts?.build}`
          : "Aucun script build détecté dans package.json.",
        blocking: !hasBuild,
      });

      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const hasNext =
        typeof dependencies.next === "string";

      checks.push({
        id: "framework-next",
        label: "Framework",
        status: hasNext
          ? "passed"
          : "warning",
        message: hasNext
          ? `Next.js détecté (${dependencies.next}).`
          : "Next.js n'a pas été détecté dans les dépendances.",
        blocking: false,
      });
    } catch {
      checks.push({
        id: "package-json-valid",
        label: "package.json",
        status: "failed",
        message:
          "package.json contient un JSON invalide.",
        blocking: true,
      });
    }
  }

  const secretFiles =
    hasSecretFiles(project.files);

  checks.push({
    id: "secret-files",
    label: "Secrets",
    status:
      secretFiles.length === 0
        ? "passed"
        : "failed",
    message:
      secretFiles.length === 0
        ? "Aucun fichier de secrets évident ne sera inclus."
        : `Fichier(s) sensible(s) détecté(s) : ${secretFiles
            .map((file) => file.path)
            .join(", ")}`,
    blocking: secretFiles.length > 0,
  });

  const environment =
    detectEnvironment(project.files);

  checks.push({
    id: "environment",
    label: "Variables d'environnement",
    status:
      environment.length > 0
        ? "warning"
        : "passed",
    message:
      environment.length > 0
        ? `${environment.length} variable(s) d'environnement devront être configurées sur la plateforme de production.`
        : "Aucune variable d'environnement requise n'a été détectée dans le code.",
    blocking: false,
  });

  const errors = checks.filter(
    (check) => check.status === "failed"
  ).length;

  const warnings = checks.filter(
    (check) => check.status === "warning"
  ).length;

  const blockingErrors = checks.filter(
    (check) =>
      check.status === "failed" &&
      check.blocking
  ).length;

  const weightedPenalty =
    errors * 25 + warnings * 5;

  return {
    ready: blockingErrors === 0,
    score: Math.max(
      0,
      Math.min(100, 100 - weightedPenalty)
    ),
    errors,
    warnings,
    checks,
    environment,
  };
}
