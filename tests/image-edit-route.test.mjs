import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
  fs.readFileSync(new URL("../src/app/api/image-edit/route.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;

function createRoute({ userId = "user-1", authError, apiKey = "test-key", result = { b64_json: "edited-image" } } = {}) {
  const calls = { clients: 0, uploads: [], edits: [] };
  const routeModule = { exports: {} };

  class FakeOpenAI {
    constructor() {
      calls.clients++;
    }
    images = {
      edit: async (input) => {
        calls.edits.push(input);
        return { data: [result] };
      },
    };
  }

  vm.runInNewContext(compiled, {
    module: routeModule,
    exports: routeModule.exports,
    File,
    Buffer,
    process: { env: { OPENAI_API_KEY: apiKey } },
    console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: Response };
      if (name === "@clerk/nextjs/server") return {
        auth: async () => {
          if (authError) throw authError;
          return { userId };
        },
      };
      if (name === "@/lib/ai/providers") return { getAIModel: () => ({ id: "test-image-model" }) };
      if (name === "openai") return {
        default: FakeOpenAI,
        toFile: async (bytes, filename, options) => {
          const upload = { bytes, filename, options };
          calls.uploads.push(upload);
          return upload;
        },
      };
      throw new Error(`Import inattendu : ${name}`);
    },
  });

  return { POST: routeModule.exports.POST, calls };
}

function requestWithImage({ mask = false } = {}) {
  const data = new FormData();
  data.set("image", new File(["image"], "source.png", { type: "image/png" }));
  data.set("prompt", " Retirer le fond ");
  if (mask) {
    data.set("editMode", "mask");
    data.set("mask", new File(["mask"], "mask.png", { type: "image/png" }));
  }
  return new Request("http://localhost/api/image-edit", { method: "POST", body: data });
}

for (const apiKey of ["test-key", undefined]) {
  test(`Sans connexion : refus avant lecture et appel IA (clé ${apiKey ? "présente" : "absente"})`, async () => {
    const route = createRoute({ userId: null, apiKey: apiKey ?? "" });
    let bodyRead = false;
    const response = await route.POST({ formData: async () => {
      bodyRead = true;
      throw new Error("Le corps ne doit pas être lu");
    } });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Non autorisé." });
    assert.equal(bodyRead, false);
    assert.equal(route.calls.clients, 0);
    assert.equal(route.calls.uploads.length, 0);
    assert.equal(route.calls.edits.length, 0);
  });
}

test("Erreur Clerk : refus sans lecture ni appel IA", async () => {
  const route = createRoute({ authError: new Error("Clerk indisponible") });
  let bodyRead = false;
  const response = await route.POST({ formData: async () => { bodyRead = true; } });
  assert.equal(response.status, 500);
  assert.equal(bodyRead, false);
  assert.equal(route.calls.clients, 0);
  assert.equal(route.calls.uploads.length, 0);
  assert.equal(route.calls.edits.length, 0);
});

for (const [field, value] of [["size", "invalid"], ["quality", "invalid"], ["editMode", "invalid"], ["editMode", "mask"]]) {
  test(`Paramètres image refusés : ${field}=${value}`, async () => {
    const route = createRoute();
    const request = requestWithImage();
    const data = await request.formData();
    data.set(field, value);
    const response = await route.POST({ headers: new Headers(), formData: async () => data });
    assert.equal(response.status, 400);
    assert.equal(route.calls.edits.length, 0);
    assert.equal(route.calls.uploads.length, 0);
  });
}

for (const [type, length, status] of [["text/plain", 5, 400], ["image/png", 0, 400], ["image/png", 10 * 1024 * 1024 + 1, 413]]) {
  test(`Image invalide : ${type}, ${length} octets`, async () => {
    const route = createRoute();
    const data = new FormData();
    data.set("image", new File([new Uint8Array(length)], "image.png", { type }));
    data.set("prompt", "Modifier");
    const response = await route.POST({ headers: new Headers(), formData: async () => data });
    assert.equal(response.status, status);
    assert.equal(route.calls.edits.length, 0);
    assert.equal(route.calls.uploads.length, 0);
  });
}

test("Connecté : édition et réponse base64 conservées", async () => {
  const route = createRoute();
  const response = await route.POST(requestWithImage());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    image: { type: "base64", data: "edited-image", mimeType: "image/png" },
  });
  assert.equal(route.calls.edits.length, 1);
  const input = route.calls.edits[0];
  assert.equal(input.prompt, "Retirer le fond");
  assert.equal(input.model, "test-image-model");
  assert.equal(input.size, "1024x1024");
  assert.equal(input.quality, "medium");
  assert.equal(input.image.filename, "source.png");
  assert.equal(input.image.bytes.toString(), "image");
  assert.equal(input.mask, undefined);
});

test("Connecté : masque transmis et réponse URL conservée", async () => {
  const route = createRoute({ result: { url: "https://example.com/edited.png" } });
  const response = await route.POST(requestWithImage({ mask: true }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    image: { type: "url", data: "https://example.com/edited.png", mimeType: "image/png" },
  });
  assert.equal(route.calls.uploads.length, 2);
  assert.equal(route.calls.edits[0].mask.filename, "mask.png");
  assert.equal(route.calls.edits[0].mask.bytes.toString(), "mask");
});

for (const missing of ["image", "prompt"]) {
  test(`Connecté : ${missing} manquant refusé sans appel IA`, async () => {
    const route = createRoute();
    const data = new FormData();
    if (missing !== "image") data.set("image", new File(["image"], "source.png"));
    if (missing !== "prompt") data.set("prompt", "Retirer le fond");
    const response = await route.POST({ headers: new Headers(), formData: async () => data });
    assert.equal(response.status, 400);
    assert.equal(route.calls.clients, 0);
    assert.equal(route.calls.uploads.length, 0);
    assert.equal(route.calls.edits.length, 0);
  });
}
