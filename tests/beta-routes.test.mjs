import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const cache = new Map();
function load(file, dependencies) {
  if (!cache.has(file)) cache.set(file, ts.transpileModule(
    fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText);
  const routeModule = { exports: {} };
  vm.runInNewContext(cache.get(file), {
    module: routeModule, exports: routeModule.exports, Buffer, File, Headers,
    process: { env: { OPENAI_API_KEY: "test-key" } },
    console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: Response };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Import inattendu : ${name}`);
    },
  });
  return routeModule.exports;
}
const validation = load("src/lib/ai/request-validation.ts", {});

function setup(route, { userId = "user-1", authError, allowedProject = false } = {}) {
  const calls = { ai: 0, projects: 0, writes: 0 };
  const orchestrator = { result: "Résultat", plan: { strategy: "single", steps: [] }, steps: [], observability: {} };
  class FakeOpenAI {
    responses = { create: async () => { calls.ai++; return { output_text: "Plan" }; } };
    audio = { transcriptions: { create: async () => { calls.ai++; return { text: "Bonjour" }; } } };
  }
  const dependencies = {
    "@clerk/nextjs/server": { auth: async () => {
      if (authError) throw authError;
      return { userId };
    } },
    "@/lib/ai/request-validation": validation,
    openai: { default: FakeOpenAI },
    "@/lib/ai/providers": { getAIModel: () => ({ id: "test-model" }) },
    "@/lib/ai/research-engine": { researchWeb: async () => { calls.ai++; return { text: "Résultat", sources: [] }; } },
    "@/lib/ai/orchestrator": { orchestrate: async () => { calls.ai++; return orchestrator; } },
    "@/lib/db/user-workspace": { getOrCreateUserWorkspace: async () => userId ? { id: "workspace-1" } : null },
    "@/lib/db/prisma": { prisma: {
      project: {
        findFirst: async ({ where }) => {
          calls.projects++;
          assert.equal(where.workspaceId, "workspace-1");
          return allowedProject ? { id: where.id } : null;
        },
        create: async () => { calls.writes++; return { id: "new-project" }; },
      },
      fileAsset: { deleteMany: async () => {}, createMany: async () => {} },
      $transaction: async () => { calls.writes++; },
    } },
    "@/lib/ai/builder-engine": { buildProject: async () => {
      calls.ai++;
      return { name: "Projet", description: "Description", stack: "next", files: [] };
    } },
    "@/lib/ai/business-factory": { executeBusinessFactory: async () => {
      calls.ai++;
      return { status: "completed" };
    } },
  };
  return { handler: load(`src/app/api/${route}/route.ts`, dependencies).POST, calls };
}

function jsonRequest(body) {
  return new Request("http://localhost/api/test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

for (const route of ["research", "orchestrator", "business-builder", "transcribe"]) {
  test(`${route} : anonyme refusé sans lecture ni appel IA`, async () => {
    const ctx = setup(route, { userId: null });
    const response = await ctx.handler({ get headers() { throw new Error("Ne pas lire"); } });
    assert.equal(response.status, 401);
    assert.equal(ctx.calls.ai, 0);
  });
  test(`${route} : erreur d'authentification sans appel IA`, async () => {
    const ctx = setup(route, { authError: new Error("Clerk indisponible") });
    assert.equal((await ctx.handler(jsonRequest({}))).status, 500);
    assert.equal(ctx.calls.ai, 0);
  });
}

for (const [route, field] of [["research", "query"], ["orchestrator", "message"], ["business-builder", "idea"]]) {
  for (const [label, body, expected] of [
    ["valide", { [field]: "Une demande" }, 200],
    ["vide", { [field]: "   " }, 400],
    ["type incorrect", { [field]: {} }, 400],
    ["trop long", { [field]: "x".repeat(12001) }, 413],
    ["objet null", null, 400],
  ]) {
    test(`${route} : ${label}`, async () => {
      const ctx = setup(route);
      assert.equal((await ctx.handler(jsonRequest(body))).status, expected);
      assert.equal(ctx.calls.ai, expected === 200 ? 1 : 0);
    });
  }
  test(`${route} : JSON malformé répond 400`, async () => {
    const ctx = setup(route);
    const response = await ctx.handler(new Request("http://localhost", { method: "POST", body: "{" }));
    assert.equal(response.status, 400);
    assert.equal(ctx.calls.ai, 0);
  });
}

test("JSON : taille réelle limitée même sans Content-Length", async () => {
  const ctx = setup("research");
  assert.equal((await ctx.handler(jsonRequest({ query: "é".repeat(40000) }))).status, 413);
  assert.equal(ctx.calls.ai, 0);
});

test("JSON : taille annoncée excessive refusée avant lecture", async () => {
  const ctx = setup("research");
  const response = await ctx.handler({ headers: new Headers({ "content-length": "999999" }),
    get body() { throw new Error("Ne pas lire"); } });
  assert.equal(response.status, 413);
  assert.equal(ctx.calls.ai, 0);
});

for (const [type, content, expected] of [["audio/webm", "audio", 200], ["text/plain", "texte", 400], ["audio/webm", "", 400]]) {
  test(`Transcription : type ${type}, taille ${content.length}`, async () => {
    const ctx = setup("transcribe");
    const body = new FormData();
    body.set("audio", new File([content], "audio.webm", { type }));
    const response = await ctx.handler(new Request("http://localhost", { method: "POST", body }));
    assert.equal(response.status, expected);
    assert.equal(ctx.calls.ai, expected === 200 ? 1 : 0);
  });
}

test("Transcription : fichier trop volumineux refusé sans appel IA", async () => {
  const ctx = setup("transcribe");
  const body = new FormData();
  body.set("audio", new File([new Uint8Array(20 * 1024 * 1024 + 1)], "audio.webm", { type: "audio/webm" }));
  const response = await ctx.handler({ headers: new Headers(), formData: async () => body });
  assert.equal(response.status, 413);
  assert.equal(ctx.calls.ai, 0);
});

test("Transcription : formulaire malformé refusé sans appel IA", async () => {
  const ctx = setup("transcribe");
  assert.equal((await ctx.handler(jsonRequest({}))).status, 400);
  assert.equal(ctx.calls.ai, 0);
});

test("Builder : projet interdit refusé avant génération payante", async () => {
  const ctx = setup("builder");
  const response = await ctx.handler(jsonRequest({ prompt: "Créer une page", projectId: "other-project" }));
  assert.equal(response.status, 403);
  assert.equal(ctx.calls.ai, 0);
  assert.equal(ctx.calls.writes, 0);
});

test("Builder : anonyme refusé avant lecture du corps", async () => {
  const ctx = setup("builder", { userId: null });
  const response = await ctx.handler({ headers: new Headers(), json: async () => { throw new Error("Ne pas lire"); } });
  assert.equal(response.status, 401);
  assert.equal(ctx.calls.ai, 0);
  assert.equal(ctx.calls.projects, 0);
});

test("Builder : projet autorisé conserve son parcours", async () => {
  const ctx = setup("builder", { allowedProject: true });
  const response = await ctx.handler(jsonRequest({ prompt: "Créer une page", projectId: "own-project" }));
  assert.equal(response.status, 200);
  assert.equal(ctx.calls.ai, 1);
  assert.equal(ctx.calls.writes, 1);
});

test("Builder : création d'un nouveau projet conservée", async () => {
  const ctx = setup("builder");
  assert.equal((await ctx.handler(jsonRequest({ prompt: "Créer une page" }))).status, 200);
  assert.equal(ctx.calls.ai, 1);
  assert.equal(ctx.calls.writes, 2);
});

test("Business Factory : nombre de livrables plafonné avant appel IA", async () => {
  const ctx = setup("business-factory/execute");
  const response = await ctx.handler(jsonRequest({
    factory: { project: { name: "Projet" }, deliverables: Array.from({ length: 13 }, () => ({ required: true })) },
  }));
  assert.equal(response.status, 400);
  assert.equal(ctx.calls.ai, 0);
});
