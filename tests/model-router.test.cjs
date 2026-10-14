const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "src/lib/ai/orchestrator/model-router.ts",
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

function createRouter(errorFactory) {
  let calls = 0;
  const module = { exports: {} };

  class FakeOpenAI {
    responses = {
      create: async () => {
        calls++;
        const outcome = errorFactory(calls);
        if (outcome && outcome.success) {
          return {
            output_text: "Réponse simulée",
            usage: {
              input_tokens: 1200,
              output_tokens: 800,
              total_tokens: 2000,
            },
          };
        }
        throw outcome;
      },
    };
  }

  const registry = {
    fast: { id: "fast", tier: "fast", enabled: true },
    balanced: { id: "balanced", tier: "balanced", enabled: true },
    powerful: { id: "powerful", tier: "powerful", enabled: true },
  };

  const requireMock = (name) => {
    if (name === "./model-cost") {
      return {
        calculateModelCost: (modelId, usage) => ({
          status: "unavailable",
          modelId,
          reason: usage
            ? "missing_pricing"
            : "missing_usage",
        }),
      };
    }
    if (name === "./usage-metrics") {
      return {
        extractUsageMetrics: (response) => {
          const usage = response.usage;
          if (!usage) return null;
          const inputTokens = usage.input_tokens ?? 0;
          const outputTokens = usage.output_tokens ?? 0;
          return {
            inputTokens,
            outputTokens,
            totalTokens:
              usage.total_tokens ??
              inputTokens + outputTokens,
          };
        },
      };
    }

    if (name === "openai") {
      return FakeOpenAI;
    }

    if (name === "./model-registry") {
      return {
        AI_MODEL_REGISTRY: registry,
        getModelForRole: () => registry.powerful,
        getFallbackModel: (model) =>
          model.tier === "powerful"
            ? registry.balanced
            : model.tier === "balanced"
              ? registry.fast
              : null,
      };
    }

    throw new Error(`Import inattendu : ${name}`);
  };

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: requireMock,
    process: { env: { OPENAI_API_KEY: "test" } },
    console: { info() {}, warn() {}, error() {} },
  });

  return {
    run: module.exports.runRoutedResponse,
    getCalls: () => calls,
  };
}

test("401 : arrêt immédiat", async () => {
  const router = createRouter(() => ({ status: 401 }));

  await assert.rejects(router.run("code", "high", {}));
  assert.equal(router.getCalls(), 1);
});

test("503 : deux appels maximum", async () => {
  const router = createRouter(() => ({ status: 503 }));

  await assert.rejects(router.run("code", "high", {}));
  assert.equal(router.getCalls(), 2);
});

test("Quota épuisé : arrêt immédiat", async () => {
  const router = createRouter(() => ({
    status: 429,
    code: "insufficient_quota",
  }));

  await assert.rejects(router.run("code", "high", {}));
  assert.equal(router.getCalls(), 1);
});

test("503 puis succès du secours", async () => {
  const router = createRouter((attempt) =>
    attempt === 1
      ? { status: 503 }
      : { success: true }
  );

  const result = await router.run("code", "high", {});

  assert.equal(router.getCalls(), 2);
  assert.equal(result.response.output_text, "Réponse simulée");
  assert.equal(result.trace.fallbackUsed, true);
  assert.equal(result.trace.cost.status, "unavailable");
  assert.equal(result.trace.cost.reason, "missing_pricing");
  assert.equal(
    result.trace.cost.modelId,
    result.trace.selectedModel
  );

  assert.equal(result.trace.attempts.length, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.trace.usage)),
    {
      inputTokens: 1200,
      outputTokens: 800,
      totalTokens: 2000,
    }
  );

});
