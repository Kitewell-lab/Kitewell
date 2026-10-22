import test from "node:test";
import assert from "node:assert/strict";

import {
  assertMultisigThresholdSatisfied,
  MultisigThresholdNotSatisfiedError,
  MultisigThresholdCheckError,
} from "./multisigThresholdCheck.js";

test("assertMultisigThresholdSatisfied throws MultisigThresholdNotSatisfiedError with deficit info", () => {
  assert.throws(
    () => assertMultisigThresholdSatisfied([1, 2], 5),
    (err) => {
      assert.ok(err instanceof MultisigThresholdNotSatisfiedError);
      assert.equal(err.totalWeight, 3);
      assert.equal(err.threshold, 5);
      assert.equal(err.deficit, 2);
      assert.equal(err.code, "THRESHOLD_NOT_SATISFIED");
      return true;
    }
  );
});

test("assertMultisigThresholdSatisfied throws MultisigThresholdCheckError on malformed arguments", () => {
  assert.throws(
    () => assertMultisigThresholdSatisfied("not-array", 5),
    (err) => {
      assert.ok(err instanceof MultisigThresholdCheckError);
      assert.equal(err.code, "INVALID_WEIGHTS_TYPE");
      return true;
    }
  );
});

test("assertMultisigThresholdSatisfied returns summary when threshold is met", () => {
  const summary = assertMultisigThresholdSatisfied([10, 20], 25);
  assert.equal(summary.satisfied, true);
  assert.equal(summary.totalWeight, 30);
  assert.equal(summary.threshold, 25);
  assert.equal(summary.excess, 5);
});
