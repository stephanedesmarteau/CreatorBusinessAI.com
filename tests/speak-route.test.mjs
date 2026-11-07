import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(
  new URL("../src/app/api/speak/route.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function createRoute({ userId = "user-1", authError } = {}) {
  const calls = [];
  const routeModule = { exports: {} };
  const audio = { type: "base64", data: "fake-audio", mimeType: "audio/mpeg" };

  vm.runInNewContext(compiled, {
    exports: routeModule.exports,
    module: routeModule,
    console: { error() {} },
    require(name) {
      if (name === "next/server") {
        return { NextResponse: Response };
      }
      if (name === "@clerk/nextjs/server") {
        return {
          auth: async () => {
            if (authError) throw authError;
            return { userId };
          },
        };
      }
      if (name === "@/lib/ai/voice-engine") {
        return {
          generateVoice: async (...args) => {
            calls.push(args);
            return audio;
          },
        };
      }
      throw new Error(`Import inattendu : ${name}`);
    },
  });

  return { POST: routeModule.exports.POST, calls, audio };
}

test("Sans connexion : 401 avant lecture du corps et sans appel IA", async () => {
  const route = createRoute({ userId: null });
  let bodyRead = false;
  const response = await route.POST({
    json: async () => {
      bodyRead = true;
      throw new Error("Le corps ne doit pas être lu");
    },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Non autorisé." });
  assert.equal(bodyRead, false);
  assert.equal(route.calls.length, 0);
});

test("Connecté : génération vocale et réponse conservées", async () => {
  const route = createRoute();
  const response = await route.POST({
    json: async () => ({ text: " Bonjour ", voiceName: "coral" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(route.calls, [["Bonjour", "coral"]]);
  assert.deepEqual(await response.json(), { success: true, audio: route.audio });
});

test("Connecté : texte vide refusé sans appel IA", async () => {
  const route = createRoute();
  const response = await route.POST({ json: async () => ({ text: "   " }) });

  assert.equal(response.status, 400);
  assert.equal(route.calls.length, 0);
});

test("Erreur d'authentification : aucun appel IA", async () => {
  const route = createRoute({ authError: new Error("Indisponible") });
  let bodyRead = false;
  const response = await route.POST({
    json: async () => {
      bodyRead = true;
      return { text: "Bonjour" };
    },
  });

  assert.equal(response.status, 500);
  assert.equal(bodyRead, false);
  assert.equal(route.calls.length, 0);
});
