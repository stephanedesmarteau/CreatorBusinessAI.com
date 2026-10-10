import type {
  ModelExecutionTrace,
} from "./model-router";

export type OrchestratorAgent =
  | "business"
  | "code"
  | "research"
  | "marketing"
  | "general";

export type OrchestratorStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type OrchestratorStep = {
  id: string;
  title: string;
  agent: OrchestratorAgent;
  objective: string;
  dependsOn: string[];
  status: OrchestratorStepStatus;
};

export type OrchestratorPlan = {
  mission: string;
  strategy: string;
  steps: OrchestratorStep[];
  modelTrace?: ModelExecutionTrace;
};

export type OrchestratorStepResult = {
  id: string;
  title: string;
  agent: OrchestratorAgent;
  objective: string;
  status: "completed" | "failed";
  output: string;
  durationMs?: number;
  modelTrace?: ModelExecutionTrace;
  engine?: "model-router" | "research-web";
};

export type OrchestratorObservability = {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  modelCalls: number;
  fallbackCount: number;
  modelsUsed: string[];
  plannerTrace?: ModelExecutionTrace;
  synthesizerTrace?: ModelExecutionTrace;
};

export type OrchestratorResult = {
  mission: string;
  plan: OrchestratorPlan;
  steps: OrchestratorStepResult[];
  result: string;
  observability: OrchestratorObservability;
};
