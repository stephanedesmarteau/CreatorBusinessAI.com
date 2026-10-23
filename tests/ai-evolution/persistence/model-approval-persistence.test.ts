import assert from "node:assert/strict";
import { test } from "node:test";

function requireHumanConfirmation(
  humanConfirmed: boolean
): void {
  if (humanConfirmed !== true) {
    throw new Error("Confirmation humaine explicite requise.");
  }
}

test("Sans confirmation humaine : persistance refusee", () => {
  assert.throws(
    () => requireHumanConfirmation(false),
    /Confirmation humaine explicite requise/
  );
});
