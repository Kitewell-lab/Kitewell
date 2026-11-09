import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";
import { MULTISIG_THRESHOLD_ERROR } from "./multisigThresholdCheckConstants.js";

test("does not mutate the input weights array and freezes error constants", () => {
  const weights = [1, 2, 3];
  checkMultisigThreshold(weights, 4);
  assert.deepEqual(weights, [1, 2, 3]);
  assert.equal(Object.isFrozen(MULTISIG_THRESHOLD_ERROR), true);
});
