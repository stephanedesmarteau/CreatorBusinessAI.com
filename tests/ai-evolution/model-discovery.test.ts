import assert from "node:assert/strict";
import test from "node:test";

import { EvolutionModelCatalog } from "../../src/lib/ai/evolution/model-catalog";
import { discoverModels } from "../../src/lib/ai/evolution/model-discovery";

test("un modèle valide est découvert sans activation automatique", () => {
  const catalog = new EvolutionModelCatalog();

  const result = discoverModels(catalog, [
    {
      id: "model-test",
      provider: "provider-test",
      name: "Modèle de test",
      tier: "balanced",
      capabilities: ["text"],
      source: "catalogue-test",
    },
  ]);

  assert.deepEqual(result, {
    discovered: 1,
    skipped: 0,
    rejected: 0,
  });

  const model = catalog.get("provider-test", "model-test");

  assert.ok(model);
  assert.equal(model.status, "DISCOVERED");
  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});

test("un identifiant externe null est rejeté sans interrompre la découverte", () => {
  const catalog = new EvolutionModelCatalog();

  const result = discoverModels(catalog, [
    {
      id: null,
      provider: "provider-test",
      name: "Modèle invalide",
      tier: "balanced",
      capabilities: ["text"],
      source: "catalogue-test",
    } as unknown as Parameters<typeof discoverModels>[1][number],
    {
      id: "model-valide",
      provider: "provider-test",
      name: "Modèle valide",
      tier: "balanced",
      capabilities: ["text"],
      source: "catalogue-test",
    },
  ]);

  assert.deepEqual(result, {
    discovered: 1,
    skipped: 0,
    rejected: 1,
  });

  assert.equal(catalog.get("provider-test", "model-valide")?.status, "DISCOVERED");
  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});

test("une capacité externe inconnue est rejetée sans interrompre la découverte", () => {
  const catalog = new EvolutionModelCatalog();

  const result = discoverModels(catalog, [
    {
      id: "modele-capacite-invalide",
      provider: "provider-test",
      name: "Modèle invalide",
      tier: "balanced",
      capabilities: ["text", "capacite-inconnue"] as unknown as Parameters<typeof discoverModels>[1][number]["capabilities"],
      source: "catalogue-test",
    },
    {
      id: "modele-capacite-valide",
      provider: "provider-test",
      name: "Modèle valide",
      tier: "balanced",
      capabilities: ["reasoning", "coding"],
      source: "catalogue-test",
    },
  ]);

  assert.deepEqual(result, {
    discovered: 1,
    skipped: 0,
    rejected: 1,
  });

  assert.equal(catalog.get("provider-test", "modele-capacite-invalide"), null);
  assert.equal(catalog.get("provider-test", "modele-capacite-valide")?.status, "DISCOVERED");
  assert.equal(catalog.listByStatus("ACTIVE").length, 0);
});
