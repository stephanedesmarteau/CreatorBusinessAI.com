import assert from "node:assert/strict";
import test from "node:test";

import { EvolutionModelCatalog } from "../../src/lib/ai/evolution/model-catalog";

test("un doublon ne remplace pas un modèle déjà découvert", () => {
  const catalog = new EvolutionModelCatalog();

  const original = {
    id: "modele-test",
    provider: "provider-test",
    name: "Modèle original",
    tier: "balanced" as const,
    capabilities: ["text" as const],
    status: "DISCOVERED" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  assert.equal(catalog.register(original), true);

  const duplicate = {
    ...original,
    name: "Modèle remplacé",
    capabilities: ["coding" as const],
    discoveredAt: "2026-10-29T01:00:00.000Z",
  };

  assert.equal(catalog.register(duplicate), false);
  assert.deepEqual(catalog.get("provider-test", "modele-test"), original);
  assert.equal(catalog.list().length, 1);
  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});

test("un modèle ACTIVE ne peut pas être enregistré directement", () => {
  const catalog = new EvolutionModelCatalog();

  const model = {
    id: "modele-non-autorise",
    provider: "provider-test",
    name: "Modèle non autorisé",
    tier: "powerful" as const,
    capabilities: ["reasoning" as const],
    status: "ACTIVE" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  assert.equal(catalog.register(model), false);
  assert.equal(catalog.get("provider-test", "modele-non-autorise"), null);
  assert.equal(catalog.list().length, 0);
  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});

test("les capacités enregistrées sont protégées contre les modifications externes", () => {
  const catalog = new EvolutionModelCatalog();

  const model = {
    id: "modele-protege",
    provider: "provider-test",
    name: "Modèle protégé",
    tier: "balanced" as const,
    capabilities: ["text" as "text" | "coding"],
    status: "DISCOVERED" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  assert.equal(catalog.register(model), true);

  model.capabilities.push("coding");

  const retrieved = catalog.get("provider-test", "modele-protege");

  assert.ok(retrieved);
  assert.deepEqual(retrieved.capabilities, ["text"]);

  retrieved.capabilities.push("coding");

  const listed = catalog.list();
  listed[0].capabilities.push("coding");

  assert.deepEqual(
    catalog.get("provider-test", "modele-protege")?.capabilities,
    ["text"]
  );

  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});

test("deux fournisseurs peuvent utiliser le même identifiant de modèle", () => {
  const catalog = new EvolutionModelCatalog();

  const modelA = {
    id: "modele-partage",
    provider: "provider-a",
    name: "Modèle fournisseur A",
    tier: "balanced" as const,
    capabilities: ["text" as const],
    status: "DISCOVERED" as const,
    discoveredAt: "2026-10-29T00:00:00.000Z",
  };

  const modelB = {
    ...modelA,
    provider: "provider-b",
    name: "Modèle fournisseur B",
    capabilities: ["coding" as const],
  };

  assert.equal(catalog.register(modelA), true);
  assert.equal(catalog.register(modelB), true);

  assert.deepEqual(catalog.get("provider-a", "modele-partage"), modelA);
  assert.deepEqual(catalog.get("provider-b", "modele-partage"), modelB);

  assert.equal(catalog.list().length, 2);
  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});
