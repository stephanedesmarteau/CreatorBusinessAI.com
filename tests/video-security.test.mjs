import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const sources = {
  ownership: "src/lib/ai/video-ownership.ts",
  engine: "src/lib/ai/video-engine.ts",
  status: "src/app/api/video-status/route.ts",
  content: "src/app/api/video-content/route.ts",
  router: "src/app/api/ai-router/route.ts",
  validation: "src/lib/ai/request-validation.ts",
};
const compiled = Object.fromEntries(Object.entries(sources).map(([key, file]) => [key,
  ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
]));

function setup({ userId = "alice", dbError = false, saveError = false, status = "completed", providerError = false } = {}) {
  const assets = [];
  const calls = { created: 0, retrieved: [], downloaded: [], queries: [], router: 0 };
  const cache = {};
  const video = { id: "video-1", status, model: "sora-2", size: "1280x720", seconds: "8", progress: 50 };
  const prisma = { fileAsset: {
    create: async ({ data }) => {
      if (saveError) throw new Error("DB write failure");
      assets.push({ ...data, owner: userId });
      return { id: "asset-1", ...data };
    },
    findFirst: async (query) => {
      calls.queries.push(query);
      if (dbError) throw new Error("DB read failure");
      const w = query.where;
      const match = assets.find((asset) => asset.storageKey === w.storageKey &&
        asset.mimeType === w.mimeType && asset.owner === w.workspace.owner.clerkUserId);
      return match ? { id: "asset-1" } : null;
    },
  } };
  class FakeOpenAI {
    responses = { create: async () => { calls.router++; return { output_text: "video" }; } };
    videos = {
      create: async () => { calls.created++; return video; },
      retrieve: async (id) => {
        calls.retrieved.push(id);
        if (providerError) throw new Error("private provider error");
        return video;
      },
      downloadContent: async (id) => {
        calls.downloaded.push(id);
        return new Response("fake-mp4");
      },
    };
  }
  function load(key) {
    if (cache[key]) return cache[key];
    const routeModule = { exports: {} };
    vm.runInNewContext(compiled[key], {
      module: routeModule, exports: routeModule.exports, URL, Response, Buffer,
      process: { env: { OPENAI_API_KEY: "test-key" } },
      console: { error() {} },
      require(name) {
        if (name === "openai") return { default: FakeOpenAI };
        if (name === "next/server") return { NextResponse: Response };
        if (name === "@clerk/nextjs/server") return { auth: async () => ({ userId }) };
        if (name === "@/lib/db/prisma") return { prisma };
        if (name === "@/lib/db/user-workspace") return {
          getOrCreateUserWorkspace: async () => userId ? { id: `workspace-${userId}` } : null,
        };
        if (name === "@/lib/ai/video-ownership" || name === "./video-ownership") return load("ownership");
        if (name === "@/lib/ai/video-engine") return load("engine");
        if (name === "@/lib/ai/request-validation") return load("validation");
        if (name === "@/lib/ai/providers") return { getAIModel: () => ({ id: "sora-2" }) };
        if (name === "@/lib/ai/capabilities") return { getCapability: () => ({ enabled: true }) };
        if (name === "@/lib/ai/agents") return { agentInstructions: {} };
        if (name === "@/lib/ai/image-engine") return {};
        if (name === "@/lib/ai/voice-engine") return {};
        throw new Error(`Import inattendu : ${name}`);
      },
    });
    cache[key] = routeModule.exports;
    return cache[key];
  }
  return { load, calls, assets, setUser: (value) => { userId = value; } };
}

function request(route, id = "video-1") {
  return new Request(`http://localhost/api/video-${route}?id=${encodeURIComponent(id)}`);
}

for (const route of ["status", "content"]) {
  test(`${route} : anonyme refusé avant lecture et appel fournisseur`, async () => {
    const ctx = setup({ userId: null });
    const response = await ctx.load(route).GET({ get url() { throw new Error("URL ne doit pas être lue"); } });
    assert.equal(response.status, 401);
    assert.equal(ctx.calls.queries.length, 0);
    assert.equal(ctx.calls.retrieved.length, 0);
    assert.equal(ctx.calls.downloaded.length, 0);
  });

  test(`${route} : vidéo d'un autre utilisateur refusée avant appel fournisseur`, async () => {
    const ctx = setup();
    await ctx.load("engine").generateVideo("Un paysage");
    ctx.setUser("bob");
    const response = await ctx.load(route).GET(request(route));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Vidéo introuvable." });
    assert.equal(ctx.calls.retrieved.length, 0);
    assert.equal(ctx.calls.downloaded.length, 0);
    const query = ctx.calls.queries[0];
    assert.equal(query.where.workspace.owner.clerkUserId, "bob");
    assert.equal(query.where.storageKey, "openai-video:video-1");
    assert.equal(query.where.mimeType, "video/mp4");
  });

  test(`${route} : vidéo inconnue ou ancienne sans propriétaire refusée`, async () => {
    const ctx = setup();
    const response = await ctx.load(route).GET(request(route));
    assert.equal(response.status, 404);
    assert.equal(ctx.calls.retrieved.length, 0);
    assert.equal(ctx.calls.downloaded.length, 0);
  });

  test(`${route} : erreur DB refuse l'accès sans repli vers le fournisseur`, async () => {
    const ctx = setup({ dbError: true });
    const response = await ctx.load(route).GET(request(route));
    assert.equal(response.status, 500);
    assert.equal(ctx.calls.retrieved.length, 0);
    assert.equal(ctx.calls.downloaded.length, 0);
  });

  test(`${route} : propriétaire autorisé après enregistrement serveur`, async () => {
    const ctx = setup();
    await ctx.load("engine").generateVideo("Un paysage");
    assert.equal(ctx.assets[0].workspaceId, "workspace-alice");
    const response = await ctx.load(route).GET(request(route));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.deepEqual(ctx.calls.retrieved, ["video-1"]);
    if (route === "content") {
      assert.deepEqual(ctx.calls.downloaded, ["video-1"]);
      assert.equal(response.headers.get("Content-Type"), "video/mp4");
      assert.equal(await response.text(), "fake-mp4");
    } else {
      assert.equal((await response.json()).video.id, "video-1");
      assert.equal(ctx.calls.downloaded.length, 0);
    }
  });
}

test("Téléchargement : vidéo en cours répond 409 sans télécharger", async () => {
  const ctx = setup({ status: "in_progress" });
  await ctx.load("engine").generateVideo("Un paysage");
  const response = await ctx.load("content").GET(request("content"));
  assert.equal(response.status, 409);
  assert.equal(ctx.calls.downloaded.length, 0);
});

test("Téléchargement : identifiant absent répond 400 sans requête DB ni fournisseur", async () => {
  const ctx = setup();
  const response = await ctx.load("content").GET(new Request("http://localhost/api/video-content"));
  assert.equal(response.status, 400);
  assert.equal(ctx.calls.queries.length, 0);
  assert.equal(ctx.calls.retrieved.length, 0);
});

test("Téléchargement : erreur fournisseur renvoie une erreur générique", async () => {
  const ctx = setup({ providerError: true });
  await ctx.load("engine").generateVideo("Un paysage");
  const response = await ctx.load("content").GET(request("content"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Impossible de récupérer le contenu de la vidéo." });
  assert.equal(ctx.calls.downloaded.length, 0);
});

test("Génération : authentification imposée même en appel direct du moteur", async () => {
  const ctx = setup({ userId: null });
  await assert.rejects(ctx.load("engine").generateVideo("Un paysage"), /Authentification requise/);
  assert.equal(ctx.calls.created, 0);
});

test("Génération : échec d'enregistrement ne renvoie pas d'identifiant exploitable", async () => {
  const ctx = setup({ saveError: true });
  await assert.rejects(ctx.load("engine").generateVideo("Un paysage"), /DB write failure/);
  assert.equal(ctx.assets.length, 0);
  const response = await ctx.load("status").GET(request("status"));
  assert.equal(response.status, 404);
});

for (const args of [[""], ["Paysage", "invalid"], ["Paysage", "1280x720", "999"], ["Paysage", "1280x720", "8", "unapproved-model"]]) {
  test(`Génération : paramètres invalides refusés ${JSON.stringify(args)}`, async () => {
    const ctx = setup();
    await assert.rejects(ctx.load("engine").generateVideo(...args), /Paramètres vidéo invalides/);
    assert.equal(ctx.calls.created, 0);
    assert.equal(ctx.assets.length, 0);
  });
}

test("Routeur : anonyme refusé avant lecture du corps et routage payant", async () => {
  const ctx = setup({ userId: null });
  const response = await ctx.load("router").POST({ json: async () => { throw new Error("Ne pas lire"); } });
  assert.equal(response.status, 401);
  assert.equal(ctx.calls.router, 0);
  assert.equal(ctx.calls.created, 0);
});

test("Routeur : vidéo enregistrée au propriétaire connecté avant retour", async () => {
  const ctx = setup();
  const response = await ctx.load("router").POST(new Request("http://localhost/api/ai-router", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Une vidéo de paysage" }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).video.id, "video-1");
  assert.equal(ctx.assets[0].owner, "alice");
  assert.equal(ctx.assets[0].storageKey, "openai-video:video-1");
});
