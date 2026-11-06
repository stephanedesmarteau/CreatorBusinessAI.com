import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalizeBusinessFactory } from "../../src/lib/business-factory-canonical";

test("Un meme plan produit une representation identique", () => {
  const plan = {
    project: { name: "CreatorBusinessAI", type: "web" },
    priorities: ["analyse", "construction"],
  };

  assert.equal(
    canonicalizeBusinessFactory(plan),
    canonicalizeBusinessFactory(plan)
  );
});

test("L'ordre des proprietes ne change pas le resultat", () => {
  const first = {
    project: { name: "CreatorBusinessAI", type: "web" },
    priorities: ["analyse", "construction"],
  };

  const second = {
    priorities: ["analyse", "construction"],
    project: { type: "web", name: "CreatorBusinessAI" },
  };

  assert.equal(
    canonicalizeBusinessFactory(first),
    canonicalizeBusinessFactory(second)
  );
});

test("L'ordre des elements d'un tableau est preserve", () => {
  const first = {
    priorities: ["analyse", "construction"],
  };

  const second = {
    priorities: ["construction", "analyse"],
  };

  assert.notEqual(
    canonicalizeBusinessFactory(first),
    canonicalizeBusinessFactory(second)
  );
});

test("Un plan non serialisable est refuse", () => {
  assert.throws(
    () => canonicalizeBusinessFactory(undefined),
    /Plan Business Factory invalide/
  );
});
