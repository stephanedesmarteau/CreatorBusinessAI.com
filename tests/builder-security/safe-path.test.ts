import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBuilderSafePath } from "../../src/lib/ai/builder-safe-path";

const root = "/tmp/creatorbusinessai-security-test";

test("Chemins relatifs valides", () => {
  for (const p of ["src/app/page.tsx", "package.json", "public/logo.svg"]) {
    assert.equal(resolveBuilderSafePath(root, p), `${root}/${p}`);
  }
});

test("Chemins dangereux refuses", () => {
  for (const p of ["../secret.txt", "src/../../secret.txt", "/etc/passwd", "C:/Windows/system.ini", "src\\..\\secret.txt", "src//page.tsx", "src/./page.tsx", ""]) {
    assert.throws(() => resolveBuilderSafePath(root, p));
  }
});
