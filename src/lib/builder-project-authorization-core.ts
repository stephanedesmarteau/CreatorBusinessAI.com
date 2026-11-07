export type BuilderProjectAuthorizationDependencies = {
  getWorkspace: () => Promise<{ id: string } | null>;
  projectBelongsToWorkspace: (
    projectId: string,
    workspaceId: string
  ) => Promise<boolean>;
};

export type BuilderProjectAuthorizationResult = {
  authorized: boolean;
  workspaceId: string | null;
  reason: string;
};

export async function authorizeBuilderProjectCore(
  projectId: string,
  dependencies: BuilderProjectAuthorizationDependencies
): Promise<BuilderProjectAuthorizationResult> {
  const deny = (
    reason: string
  ): BuilderProjectAuthorizationResult => ({
    authorized: false,
    workspaceId: null,
    reason,
  });

  if (typeof projectId !== "string" || !projectId.trim()) {
    return deny("Identifiant de projet requis.");
  }

  const workspace = await dependencies.getWorkspace();

  if (!workspace || !workspace.id?.trim()) {
    return deny("Authentification requise.");
  }

  const belongs = await dependencies.projectBelongsToWorkspace(
    projectId,
    workspace.id
  );

  if (!belongs) {
    return deny("Projet introuvable ou accès refusé.");
  }

  return {
    authorized: true,
    workspaceId: workspace.id,
    reason: "Accès au projet confirmé.",
  };
}
