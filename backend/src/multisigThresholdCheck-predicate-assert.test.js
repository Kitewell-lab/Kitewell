import test from "node:test";
import assert from "node:assert/strict";

import {
  assertMultisigThreshold,
  isThresholdSatisfied,
} from "./multisigThresholdCheck.js";
import { MULTISIG_THRESHOLD_ERROR } from "./multisigThresholdCheckConstants.js";

test("isThresholdSatisfied returns boolean and never throws", () => {
  assert.equal(isThresholdSatisfied([2, 2], 3), true);
  assert.equal(isThresholdSatisfied([1, 1], 3), false);
  assert.equal(isThresholdSatisfied(null, 3), false);
  assert.equal(isThresholdSatisfied([1], 300), false);
});

test("assertMultisigThreshold returns summary object or throws Error on invalid input", () => {
  assert.deepEqual(assertMultisigThreshold([2, 3], 4), {
    satisfied: true,
    totalWeight: 5,
    threshold: 4,
    shortfall: 0,
  });

  assert.throws(
    () => assertMultisigThreshold([1], 256),
    new Error(MULTISIG_THRESHOLD_ERROR.THRESHOLD_RANGE),
  );
});
