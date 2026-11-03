export function isBuilderExecutionAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv !== "production";
}

export function assertBuilderExecutionAllowed(): void {
  if (!isBuilderExecutionAllowed()) {
    throw new Error(
      "BUILDER_EXECUTION_DISABLED: " +
      "La compilation et l'execution de projets generes " +
      "sont desactivees en production tant qu'un " +
      "environnement isole n'est pas disponible."
    );
  }
}
