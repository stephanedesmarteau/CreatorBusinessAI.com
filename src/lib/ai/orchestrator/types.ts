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
};

export type OrchestratorStepResult = {
  id: string;
  title: string;
  agent: OrchestratorAgent;
  objective: string;
  status: "completed" | "failed";
  output: string;
};

export type OrchestratorResult = {
  mission: string;
  plan: OrchestratorPlan;
  steps: OrchestratorStepResult[];
  result: string;
};
