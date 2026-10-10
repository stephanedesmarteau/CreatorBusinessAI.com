export type BusinessFactoryStatus =
  | "draft"
  | "ready"
  | "running"
  | "completed"
  | "failed";

export type BusinessFactoryInput = {
  projectId?: string | null;
  projectName: string;
  idea: string;
  industry: string;
  targetMarket: string;
  budget: string;
  mainGoal: string;
  language?: string;
};

export type BusinessFactoryPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type BusinessFactoryAction = {
  id: string;
  title: string;
  description: string;
  priority: BusinessFactoryPriority;
  owner: string;
  timeframe: string;
};

export type BusinessFactoryDeliverableType =
  | "strategy"
  | "market"
  | "brand"
  | "website"
  | "web-app"
  | "mobile-app"
  | "marketing"
  | "seo"
  | "sales"
  | "finance"
  | "operations"
  | "automation";

export type BusinessFactoryDeliverable = {
  type: BusinessFactoryDeliverableType;
  title: string;
  description: string;
  required: boolean;
  status:
    | "planned"
    | "ready"
    | "running"
    | "completed"
    | "failed";
};

export type BusinessFactorySpec = {
  version: "1.0";
  status: BusinessFactoryStatus;

  project: {
    projectId: string | null;
    name: string;
    idea: string;
    industry: string;
    targetMarket: string;
    budget: string;
    mainGoal: string;
    language: string;
  };

  strategy: {
    executiveSummary: string;
    problem: string;
    targetAudience: string;
    valueProposition: string;
    positioning: string;
    competitiveAdvantage: string;
  };

  market: {
    opportunity: string;
    competitors: string[];
    assumptions: string[];
    validationPlan: string[];
  };

  businessModel: {
    revenueModel: string;
    pricing: string;
    acquisition: string;
    sales: string;
  };

  marketing: {
    message: string;
    channels: string[];
    contentPlan: string[];
    seoPlan: string[];
  };

  finance: {
    recommendedBudget: string;
    fundingNeeds: string;
    revenueTargets: string[];
    costDrivers: string[];
    kpis: string[];
  };

  execution: {
    days30: string[];
    days60: string[];
    days90: string[];
    priorities: BusinessFactoryAction[];
    risks: string[];
  };

  digital: {
    recommendedProduct:
      | "website"
      | "web-app"
      | "mobile-app"
      | "website-and-app"
      | "none";
    coreFeatures: string[];
    integrations: string[];
    automationOpportunities: string[];
  };

  deliverables: BusinessFactoryDeliverable[];

  metadata: {
    createdAt: string;
    updatedAt: string;
    source: "creatorbusinessai-business-factory";
  };
};
