import assert from "node:assert/strict";
import test from "node:test";
import {
  decideBusinessFactoryReservation,
  type BusinessFactoryReservation,
} from "../../src/lib/business-factory-idempotency";

const now = Date.now();

const reservation: BusinessFactoryReservation = {
  requestHash: "empreinte-A",
  sourceProjectId: "source-1",
  generatedProjectId: null,
  status: "RESERVED",
  updatedAt: new Date(now),
};

test("Une empreinte différente est refusée", () => {
  assert.equal(
    decideBusinessFactoryReservation(
      reservation, "empreinte-B", "source-1", now
    ),
    "CONFLICT"
  );
});

test("Un projet source différent est refusé", () => {
  assert.equal(
    decideBusinessFactoryReservation(
      reservation, "empreinte-A", "source-2", now
    ),
    "CONFLICT"
  );
});

test("Une construction terminée est réutilisable", () => {
  assert.equal(
    decideBusinessFactoryReservation(
      {
        ...reservation,
        status: "COMPLETED",
        generatedProjectId: "projet-1",
      },
      "empreinte-A", "source-1", now
    ),
    "REUSE"
  );
});

test("Une réservation active reste bloquée", () => {
  assert.equal(
    decideBusinessFactoryReservation(
      reservation, "empreinte-A", "source-1", now
    ),
    "BLOCKED"
  );
});

test("Une réservation ancienne est signalée", () => {
  assert.equal(
    decideBusinessFactoryReservation(
      {
        ...reservation,
        updatedAt: new Date(now - 16 * 60 * 1000),
      },
      "empreinte-A", "source-1", now
    ),
    "INTERRUPTED"
  );
});

test("Une construction échouée reste bloquée", () => {
  assert.equal(
    decideBusinessFactoryReservation(
      { ...reservation, status: "FAILED" },
      "empreinte-A", "source-1", now
    ),
    "BLOCKED"
  );
});
