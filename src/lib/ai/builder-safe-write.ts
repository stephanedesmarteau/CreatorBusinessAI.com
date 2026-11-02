import { constants } from "node:fs";
import { lstat, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { resolveBuilderSafePath } from "./builder-safe-path";

export async function writeBuilderSafeFile(
  root: string,
  relative: string,
  content: string
): Promise<void> {
  const absoluteRoot = path.resolve(root);
  const target = resolveBuilderSafePath(absoluteRoot, relative);

  const rootStat = await lstat(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("Dossier racine interdit.");
  }

  let current = absoluteRoot;
  const directories = path
    .relative(absoluteRoot, path.dirname(target))
    .split(path.sep)
    .filter(Boolean);

  for (const directory of directories) {
    current = path.join(current, directory);

    try {
      await mkdir(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("Dossier symbolique ou invalide interdit.");
    }
  }

  const handle = await open(
    target,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600
  );

  try {
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
}
