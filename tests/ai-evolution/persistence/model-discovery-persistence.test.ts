import assert from "node:assert/strict";
import test from "node:test";

import { prepareDiscoveryRecord } from "../../../src/lib/ai/evolution/model-discovery-persistence-core";

const candidate = {
  id: "model-test",
  provider: "provider-test",
  name: "Modèle de test",
  tier: "balanced" as const,
  capabilities: ["text" as const],
  source: "catalogue-test",
};

test("la découverte impose DISCOVERED", () => {
  const record = prepareDiscoveryRecord({
    workspaceId: "workspace-1",
    candidate,
  });

  assert.equal(record.status, "DISCOVERED");
  assert.equal(record.workspaceId, "workspace-1");
  assert.equal(record.modelId, "model-test");
});

test("un workspace vide est refusé", () => {
  assert.throws(
    () =>
      prepareDiscoveryRecord({
        workspaceId: "   ",
        candidate,
      }),
    /Workspace requis/
  );
});

test("un modèle sans identifiant est refusé", () => {
  assert.throws(
    () =>
      prepareDiscoveryRecord({
        workspaceId: "workspace-1",
        candidate: { ...candidate, id: "   " },
      }),
    /Modèle découvert invalide/
  );
});

test("un modèle sans capacités est refusé", () => {
  assert.throws(
    () =>
      prepareDiscoveryRecord({
        workspaceId: "workspace-1",
        candidate: { ...candidate, capabilities: [] },
      }),
    /Capacités du modèle requises/
  );
});
