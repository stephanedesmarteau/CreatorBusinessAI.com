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
