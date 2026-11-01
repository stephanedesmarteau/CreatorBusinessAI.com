import path from "node:path";

export function resolveBuilderSafePath(
  root: string,
  relative: string
): string {
  if (
    typeof relative !== "string" ||
    !relative.trim() ||
    relative.includes("\0") ||
    relative.includes("\\") ||
    path.posix.isAbsolute(relative) ||
    path.win32.isAbsolute(relative)
  ) {
    throw new Error("Chemin de fichier interdit.");
  }

  const segments = relative.split("/");

  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".."
    ) ||
    segments.some((segment) => segment.includes(":"))
  ) {
    throw new Error("Chemin de fichier interdit.");
  }

  const absoluteRoot = path.resolve(root);
  const resolved = path.resolve(absoluteRoot, relative);

  if (
    resolved === absoluteRoot ||
    !resolved.startsWith(absoluteRoot + path.sep)
  ) {
    throw new Error("Chemin de fichier interdit.");
  }

  return resolved;
}
