import assert from "node:assert/strict";
import { test } from "node:test";
import { executeApprovalTransaction } from "../../../src/lib/ai/evolution/transactions/model-approval-transaction";

test("TEST_CONFIRMATION_HUMAINE_OBLIGATOIRE", async () => {
  let transactionCalled = false;

  const fakeDb = {
    $transaction: async () => {
      transactionCalled = true;
      throw new Error("TRANSACTION_INTERDITE");
    },
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: false,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    /CONFIRMATION_HUMAINE_REQUISE/
  );

  assert.equal(transactionCalled, false);
});

test("TEST_IDENTITE_NON_HUMAINE", async () => {
  let transactionCalled = false;

  const fakeDb = {
    $transaction: async () => {
      transactionCalled = true;
      throw new Error("TRANSACTION_INTERDITE");
    },
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "system",
        fakeDb as any
      ),
    /IDENTITE_HUMAINE_NON_VALIDE/
  );

  assert.equal(transactionCalled, false);
});

test("TEST_PROPRIETAIRE_NON_AUTORISE", async () => {
  let transactions = 0;
  let modelRead = false;

  const fakeDb = {
    $transaction: async (callback: any) => {
      transactions++;

      return callback({
        workspace: {
          findFirst: async () => null,
        },
        evolutionModelRecord: {
          findFirst: async () => {
            modelRead = true;
            throw new Error("LECTURE_INTERDITE");
          },
        },
      });
    },
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "utilisateur-non-proprietaire",
        fakeDb as any
      ),
    /PROPRIETAIRE_NON_AUTORISE/
  );

  assert.equal(transactions, 1);
  assert.equal(modelRead, false);
});

test("TEST_MODELE_NON_EVALUE", async () => {
  let evaluationRead = false;
  let modelUpdated = false;

  const fakeDb = {
    $transaction: async (callback: any) =>
      callback({
        workspace: {
          findFirst: async () => ({ id: "workspace-test" }),
        },
        evolutionModelRecord: {
          findFirst: async () => ({
            id: "model-test",
            status: "DISCOVERED",
          }),
          updateMany: async () => {
            modelUpdated = true;
            throw new Error("MODIFICATION_INTERDITE");
          },
        },
        evolutionEvaluationRecord: {
          findFirst: async () => {
            evaluationRead = true;
            throw new Error("LECTURE_INTERDITE");
          },
        },
      }),
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    /MODELE_NON_ADMISSIBLE/
  );

  assert.equal(evaluationRead, false);
  assert.equal(modelUpdated, false);
});

test("TEST_EVALUATION_INCOMPATIBLE", async () => {
  let updated = false;
  let approvalCreated = false;

  const fakeDb = {
    $transaction: async (callback: any) =>
      callback({
        workspace: {
          findFirst: async () => ({ id: "workspace-test" }),
        },
        evolutionModelRecord: {
          findFirst: async () => ({
            id: "model-test",
            status: "EVALUATED",
          }),
          updateMany: async () => {
            updated = true;
            throw new Error("MODIFICATION_INTERDITE");
          },
        },
        evolutionEvaluationRecord: {
          findFirst: async () => ({
            id: "evaluation-test",
            compatible: false,
            capabilitiesVerified: true,
          }),
        },
        evolutionApprovalRecord: {
          create: async () => {
            approvalCreated = true;
            throw new Error("CREATION_INTERDITE");
          },
        },
      }),
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    /EVALUATION_NON_ADMISSIBLE/
  );

  assert.equal(updated, false);
  assert.equal(approvalCreated, false);
});

test("TEST_CAPACITES_NON_VERIFIEES", async () => {
  let updated = false;
  let approvalCreated = false;

  const fakeDb = {
    $transaction: async (callback: any) =>
      callback({
        workspace: {
          findFirst: async () => ({ id: "workspace-test" }),
        },
        evolutionModelRecord: {
          findFirst: async () => ({
            id: "model-test",
            status: "EVALUATED",
          }),
          updateMany: async () => {
            updated = true;
            throw new Error("MODIFICATION_INTERDITE");
          },
        },
        evolutionEvaluationRecord: {
          findFirst: async () => ({
            id: "evaluation-test",
            compatible: true,
            capabilitiesVerified: false,
          }),
        },
        evolutionApprovalRecord: {
          create: async () => {
            approvalCreated = true;
            throw new Error("CREATION_INTERDITE");
          },
        },
      }),
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    /EVALUATION_NON_ADMISSIBLE/
  );

  assert.equal(updated, false);
  assert.equal(approvalCreated, false);
});

test("TEST_DOUBLE_APPROBATION", async () => {
  let updateCount = 0;
  let approvalCreated = false;

  const fakeDb = {
    $transaction: async (callback: any) =>
      callback({
        workspace: {
          findFirst: async () => ({ id: "workspace-test" }),
        },
        evolutionModelRecord: {
          findFirst: async () => ({
            id: "model-test",
            status: "EVALUATED",
          }),
          updateMany: async () => {
            updateCount++;
            return { count: 0 };
          },
        },
        evolutionEvaluationRecord: {
          findFirst: async () => ({
            id: "evaluation-test",
            compatible: true,
            capabilitiesVerified: true,
          }),
        },
        evolutionApprovalRecord: {
          create: async () => {
            approvalCreated = true;
            throw new Error("CREATION_INTERDITE");
          },
        },
      }),
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    /APPROBATION_DEJA_TRAITEE/
  );

  assert.equal(updateCount, 1);
  assert.equal(approvalCreated, false);
});

test("TEST_CONFLIT_TRANSACTION_RECUPERE", async () => {
  let attempts = 0;
  let approvalsCreated = 0;

  const fakeDb = {
    $transaction: async (callback: any) => {
      attempts++;

      if (attempts < 3) {
        throw Object.assign(
          new Error("CONFLIT_TRANSACTION"),
          { code: "P2034" }
        );
      }

      return callback({
        workspace: {
          findFirst: async () => ({ id: "workspace-test" }),
        },
        evolutionModelRecord: {
          findFirst: async () => ({
            id: "model-test",
            status: "EVALUATED",
          }),
          updateMany: async () => ({ count: 1 }),
        },
        evolutionEvaluationRecord: {
          findFirst: async () => ({
            id: "evaluation-test",
            compatible: true,
            capabilitiesVerified: true,
          }),
        },
        evolutionApprovalRecord: {
          create: async () => {
            approvalsCreated++;
            return { id: "approval-test" };
          },
        },
      });
    },
  };

  const result = await executeApprovalTransaction(
    {
      workspaceId: "workspace-test",
      modelRecordId: "model-test",
      evaluationId: "evaluation-test",
      humanConfirmed: true,
    },
    "proprietaire-test",
    fakeDb as any
  );

  assert.equal(attempts, 3);
  assert.equal(approvalsCreated, 1);
  assert.equal(result.status, "APPROVED");
  assert.equal(result.approvalId, "approval-test");
});

test("TEST_LIMITE_TROIS_TENTATIVES", async () => {
  let attempts = 0;

  const fakeDb = {
    $transaction: async () => {
      attempts++;

      throw Object.assign(
        new Error("CONFLIT_TRANSACTION_PERSISTANT"),
        { code: "P2034" }
      );
    },
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    (error: any) =>
      error.code === "P2034" &&
      error.message === "CONFLIT_TRANSACTION_PERSISTANT"
  );

  assert.equal(attempts, 3);
});

test("TEST_ERREUR_NON_REPETEE", async () => {
  let attempts = 0;

  const fakeDb = {
    $transaction: async () => {
      attempts++;

      throw Object.assign(
        new Error("ERREUR_TRANSACTION_ORDINAIRE"),
        { code: "P2002" }
      );
    },
  };

  await assert.rejects(
    () =>
      executeApprovalTransaction(
        {
          workspaceId: "workspace-test",
          modelRecordId: "model-test",
          evaluationId: "evaluation-test",
          humanConfirmed: true,
        },
        "proprietaire-test",
        fakeDb as any
      ),
    (error: any) =>
      error.code === "P2002" &&
      error.message === "ERREUR_TRANSACTION_ORDINAIRE"
  );

  assert.equal(attempts, 1);
});

test("TEST_APPROBATION_REUSSIE", async () => {
  let attempts = 0;
  let updates = 0;
  let approvals = 0;
  let isolationLevel = "";
  let recordedOwner = "";

  const fakeDb = {
    $transaction: async (callback: any, options: any) => {
      attempts++;
      isolationLevel = options?.isolationLevel;

      return callback({
        workspace: {
          findFirst: async () => ({ id: "workspace-test" }),
        },
        evolutionModelRecord: {
          findFirst: async () => ({
            id: "model-test",
            status: "EVALUATED",
          }),
          updateMany: async () => {
            updates++;
            return { count: 1 };
          },
        },
        evolutionEvaluationRecord: {
          findFirst: async () => ({
            id: "evaluation-test",
            compatible: true,
            capabilitiesVerified: true,
          }),
        },
        evolutionApprovalRecord: {
          create: async ({ data }: any) => {
            approvals++;
            recordedOwner = data.approvedById;
            return { id: "approval-test" };
          },
        },
      });
    },
  };

  const result = await executeApprovalTransaction(
    {
      workspaceId: "workspace-test",
      modelRecordId: "model-test",
      evaluationId: "evaluation-test",
      humanConfirmed: true,
    },
    "proprietaire-test",
    fakeDb as any
  );

  assert.equal(attempts, 1);
  assert.equal(updates, 1);
  assert.equal(approvals, 1);
  assert.equal(recordedOwner, "proprietaire-test");
  assert.equal(isolationLevel, "Serializable");

  assert.deepEqual(result, {
    approvalId: "approval-test",
    modelRecordId: "model-test",
    status: "APPROVED",
  });
});
