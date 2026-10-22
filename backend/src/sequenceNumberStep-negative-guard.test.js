import test from "node:test";
import assert from "node:assert/strict";

import { decrementSequence, stepSequenceNumber, InvalidSequenceNumberError } from "./sequenceNumberStep.js";

test("guards against decrementing sequence below zero", () => {
  assert.throws(
    () => decrementSequence("0", 1),
    (err) => {
      assert(err instanceof InvalidSequenceNumberError);
      assert.match(err.message, /cannot be negative/);
      return true;
    }
  );

  assert.throws(
    () => decrementSequence("10", 11),
    InvalidSequenceNumberError
  );
});

test("guards against negative result in stepSequenceNumber with negative step", () => {
  assert.throws(
    () => stepSequenceNumber("5", -6),
    InvalidSequenceNumberError
  );
});
