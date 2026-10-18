import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const TARGET_PROJECT_ID =
  "cmu7dyzqm0003a4m9bdvli7pn";

const PRESET_DIRECTORY = path.join(
  process.cwd(),
  "src/lib/ai/builder-presets/creatorbusinessai-test"
);

type BuilderFile = {
  path: string;
  content: string;
};

export async function applyCreatorBusinessTestPreset(
  projectId: string,
  files: BuilderFile[]
): Promise<BuilderFile[]> {
  if (projectId !== TARGET_PROJECT_ID) {
    return files;
  }

  const replacements = [
    {
      path: "src/app/globals.css",
      filename: "globals.css",
    },
    {
      path: "tailwind.config.ts",
      filename: "tailwind.config.ts",
    },
    {
      path: "next.config.mjs",
      filename: "next.config.mjs",
    },
    {
      path: "src/app/studio/page.tsx",
      filename: "studio-page.tsx",
    },
  ];

  const updated = files.map((file) => ({ ...file }));

  for (const replacement of replacements) {
    const content = await readFile(
      path.join(PRESET_DIRECTORY, replacement.filename),
      "utf8"
    );

    const index = updated.findIndex(
      (file) => file.path === replacement.path
    );

    if (index < 0) {
      throw new Error(
        `Fichier requis absent : ${replacement.path}`
      );
    }

    updated[index] = {
      path: replacement.path,
      content,
    };
  }

  return updated;
}
