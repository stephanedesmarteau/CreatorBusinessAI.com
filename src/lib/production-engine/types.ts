export type ProductionProvider =
  | "vercel"
  | "github"
  | "local"
  | "custom";

export type ProductionCheckStatus =
  | "passed"
  | "warning"
  | "failed";

export type ProductionCheck = {
  id: string;
  label: string;
  status: ProductionCheckStatus;
  message: string;
  blocking: boolean;
};

export type EnvironmentRequirement = {
  key: string;
  required: boolean;
  detected: boolean;
  sourceFiles: string[];
};

export type ProductionFile = {
  path: string;
  content: string;
};

export type ProductionProjectSnapshot = {
  projectId: string;
  projectName: string;
  files: ProductionFile[];
  versionId?: string | null;
};

export type DeploymentReadiness = {
  ready: boolean;
  score: number;
  errors: number;
  warnings: number;
  checks: ProductionCheck[];
  environment: EnvironmentRequirement[];
};

export type DeploymentTarget = {
  provider: ProductionProvider;
  projectName: string;
  framework: "nextjs" | "unknown";
  buildCommand: string;
  installCommand: string;
  outputDirectory: string | null;
};

export type RollbackPlan = {
  supported: boolean;
  projectId: string;
  versionId: string | null;
  strategy:
    | "project-version"
    | "deployment-provider"
    | "none";
  message: string;
};

export type ProductionPlan = {
  project: ProductionProjectSnapshot;
  readiness: DeploymentReadiness;
  target: DeploymentTarget;
  rollback: RollbackPlan;
  generatedAt: string;
};
