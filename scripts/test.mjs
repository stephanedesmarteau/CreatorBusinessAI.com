import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function discover(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    if (/backup|sauvegarde|avant-/i.test(entry.name) || entry.name.startsWith(".")) return [];
    const name = join(directory, entry.name);
    if (entry.isDirectory()) return discover(name);
    return /\.test\.(ts|cjs|mjs)$/.test(entry.name) && !entry.name.endsWith(".integration.test.ts") ? [name] : [];
  });
}

// Les tests PostgreSQL nécessitent une base dédiée et une activation explicite.
const result = spawnSync(process.execPath, [
  "--import", "tsx", "--experimental-test-module-mocks", "--test", "--test-concurrency=2",
  ...discover("tests").sort(),
], { cwd: root, stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
