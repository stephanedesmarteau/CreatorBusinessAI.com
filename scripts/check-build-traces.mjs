import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? discover(path) : entry.name.endsWith(".nft.json") ? [path] : [];
  });
}
const traces = discover(join(root, ".next/server"));
assert.ok(traces.length, "Compiler le projet avant de vérifier les traces.");
const builderTrace = join(root, ".next/server/app/api/builder-build/route.js.nft.json");
const builderFiles = new Set();
for (const trace of traces) {
  for (const file of JSON.parse(readFileSync(trace, "utf8")).files) {
    const path = relative(root, resolve(dirname(trace), file)).split(sep).join("/");
    assert.ok(
      !/(^|\/)(sauvegardes|\.local-backups|\.chapter-backups)(\/|$)|\.backup|\.bak$|-avant-/.test(path),
      `Sauvegarde incluse dans le déploiement : ${path}`
    );
    if (trace === builderTrace) builderFiles.add(path);
  }
}
for (const filename of ["globals.css", "tailwind.config.ts", "next.config.mjs", "studio-page.tsx"]) {
  assert.ok(builderFiles.has(`src/lib/ai/builder-presets/creatorbusinessai-test/${filename}`),
    `Fichier du modèle Builder absent : ${filename}`);
}
console.log(`${traces.length} traces validées : aucune sauvegarde, fichiers du modèle Builder conservés.`);
