import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeBuilderSafeFile } from "../../src/lib/ai/builder-safe-write";

test("Ecriture normale dans le dossier autorise", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cbai-write-"));
  try {
    await writeBuilderSafeFile(root, "src/app/page.tsx", "contenu valide");
    assert.equal(
      await readFile(path.join(root, "src/app/page.tsx"), "utf8"),
      "contenu valide"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Refus d'un dossier parent symbolique", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cbai-write-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "cbai-outside-"));
  try {
    await symlink(outside, path.join(root, "redirect"));
    await assert.rejects(
      writeBuilderSafeFile(root, "redirect/secret.txt", "interdit")
    );
    await assert.rejects(
      readFile(path.join(outside, "secret.txt")),
      { code: "ENOENT" }
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("Refus d'un fichier destination symbolique", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cbai-write-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "cbai-outside-"));
  try {
    const protectedFile = path.join(outside, "protected.txt");
    await writeFile(protectedFile, "original", "utf8");
    await symlink(protectedFile, path.join(root, "target.txt"));

    await assert.rejects(
      writeBuilderSafeFile(root, "target.txt", "interdit")
    );
    assert.equal(await readFile(protectedFile, "utf8"), "original");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("Refus d'ecraser un fichier existant", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cbai-write-"));
  try {
    const target = path.join(root, "existing.txt");
    await writeFile(target, "original", "utf8");

    await assert.rejects(
      writeBuilderSafeFile(root, "existing.txt", "remplacement"),
      { code: "EEXIST" }
    );

    assert.equal(await readFile(target, "utf8"), "original");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
