export type AuthorizationResult = {
  authorized: boolean;
  userId: string | null;
  reason: string;
};

export type AuthorizationDependencies = {
  getUser: () => Promise<{ id: string } | null>;
  isWorkspaceOwner: (
    workspaceId: string,
    userId: string
  ) => Promise<boolean>;
};

export async function authorizeModelApprovalCore(
  workspaceId: string,
  dependencies: AuthorizationDependencies
): Promise<AuthorizationResult> {
  const denied = (reason: string): AuthorizationResult => ({
    authorized: false,
    userId: null,
    reason,
  });

  if (
    typeof workspaceId !== "string" ||
    !workspaceId.trim()
  ) {
    return denied("Workspace non spécifié.");
  }

  const user = await dependencies.getUser();

  if (!user || !user.id?.trim()) {
    return denied("Authentification requise.");
  }

  const isOwner = await dependencies.isWorkspaceOwner(
    workspaceId,
    user.id
  );

  if (!isOwner) {
    return denied(
      "Accès refusé : propriétaire non confirmé."
    );
  }

  return {
    authorized: true,
    userId: user.id,
    reason: "Propriétaire du workspace confirmé.",
  };
}
