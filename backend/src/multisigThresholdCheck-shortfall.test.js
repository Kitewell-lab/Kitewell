import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("reports satisfied: false and exact shortfall when total weight is below threshold", () => {
  assert.deepEqual(checkMultisigThreshold([1, 1], 3), {
    ok: true,
    satisfied: false,
    totalWeight: 2,
    threshold: 3,
    shortfall: 1,
  });

  assert.deepEqual(checkMultisigThreshold([], 5), {
    ok: true,
    satisfied: false,
    totalWeight: 0,
    threshold: 5,
    shortfall: 5,
  });
});
