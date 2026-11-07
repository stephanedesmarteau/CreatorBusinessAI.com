import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
  fs.readFileSync(new URL("../src/app/api/video-status/route.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;

function createRoute({ userId = "user-1", authError, apiKey = "test-key", providerError, video = {
  id: "video-1", status: "completed", progress: 100,
  model: "test-video-model", size: "1280x720", seconds: "8",
} } = {}) {
  const calls = { clients: 0, videos: [] };
  const routeModule = { exports: {} };

  class FakeOpenAI {
    constructor() { calls.clients++; }
    videos = {
      retrieve: async (id) => {
        calls.videos.push(id);
        if (providerError) throw providerError;
        return video;
      },
    };
  }

  vm.runInNewContext(compiled, {
    module: routeModule,
    exports: routeModule.exports,
    URL,
    process: { env: { OPENAI_API_KEY: apiKey } },
    console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: Response };
      if (name === "openai") return { default: FakeOpenAI };
      if (name === "@/lib/ai/video-ownership") return { ownsVideo: async () => true };
      if (name === "@clerk/nextjs/server") return {
        auth: async () => {
          if (authError) throw authError;
          return { userId };
        },
      };
      throw new Error(`Import inattendu : ${name}`);
    },
  });

  return { GET: routeModule.exports.GET, calls, video };
}

for (const apiKey of ["test-key", ""]) {
  test(`Sans connexion : 401 avant lecture et appel fournisseur (clé ${apiKey ? "présente" : "absente"})`, async () => {
    const route = createRoute({ userId: null, apiKey });
    let urlRead = false;
    const response = await route.GET({ get url() {
      urlRead = true;
      throw new Error("URL ne doit pas être lue");
    } });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Non autorisé." });
    assert.equal(urlRead, false);
    assert.equal(route.calls.clients, 0);
    assert.equal(route.calls.videos.length, 0);
  });
}

test("Erreur Clerk : aucun appel fournisseur", async () => {
  const route = createRoute({ authError: new Error("Clerk indisponible") });
  const response = await route.GET({ get url() { throw new Error("URL ne doit pas être lue"); } });
  assert.equal(response.status, 500);
  assert.equal(route.calls.clients, 0);
  assert.equal(route.calls.videos.length, 0);
});

test("Connecté : statut vidéo et réponse conservés", async () => {
  const route = createRoute();
  const response = await route.GET(new Request("http://localhost/api/video-status?id=video-1"));
  assert.equal(response.status, 200);
  assert.deepEqual(route.calls.videos, ["video-1"]);
  assert.deepEqual(await response.json(), {
    success: true, video: { ...route.video, error: null },
  });
});

test("Connecté : progression absente et erreur vidéo préservées", async () => {
  const video = {
    id: "video-2", status: "failed", model: "test-video-model",
    size: "1280x720", seconds: "8", error: { code: "failed", message: "Échec" },
  };
  const route = createRoute({ video });
  const response = await route.GET(new Request("http://localhost/api/video-status?id=video-2"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, video: { ...video, progress: 0 } });
});

test("Connecté : identifiant absent refusé sans appel fournisseur", async () => {
  const route = createRoute();
  const response = await route.GET(new Request("http://localhost/api/video-status"));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "ID vidéo manquant." });
  assert.equal(route.calls.clients, 0);
  assert.equal(route.calls.videos.length, 0);
});

test("Connecté : clé absente sans appel fournisseur", async () => {
  const route = createRoute({ apiKey: "" });
  const response = await route.GET(new Request("http://localhost/api/video-status?id=video-1"));
  assert.equal(response.status, 500);
  assert.equal(route.calls.clients, 0);
  assert.equal(route.calls.videos.length, 0);
});

test("Erreur fournisseur : réponse générique sans détail sensible", async () => {
  const route = createRoute({ providerError: new Error("Détail privé fournisseur") });
  const response = await route.GET(new Request("http://localhost/api/video-status?id=video-1"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Impossible de récupérer le statut de la vidéo." });
});
