import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(
  new URL(
    "../../../src/lib/ai/evolution/model-approval-persistence.ts",
    import.meta.url
  )
);

let transactions = 0;

mock.module(require.resolve("server-only"), {
  exports: {}
});

mock.module(require.resolve("@/lib/db/prisma"), {
  exports: { prisma: {} }
});

mock.module(require.resolve("./model-authorization"), {
  exports: {
    authorizeModelApproval: async () => ({
      authorized: true,
      userId: "owner-test",
      reason: "Propriétaire simulé"
    })
  }
});

mock.module(require.resolve("./transactions/model-approval-transaction"), {
  exports: {
    executeApprovalTransaction: async () => {
      transactions++;
      throw new Error("TRANSACTION_INTERDITE");
    }
  }
});

const module = await import(
  "../../../src/lib/ai/evolution/model-approval-persistence.ts"
);

const persist = module.persistModelApproval
  ?? module.default?.persistModelApproval;

test("Le service réel conserve son verrou de sécurité", async () => {
  assert.equal(typeof persist, "function");

  await assert.rejects(
    persist({
      workspaceId: "workspace-test",
      modelRecordId: "model-test",
      evaluationId: "evaluation-test",
      humanConfirmed: true
    }),
    /SERVICE_NON_FINALISE/
  );

  assert.equal(transactions, 0);
});
