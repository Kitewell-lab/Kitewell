import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("reports satisfied: true when signer weights meet or exceed the threshold", () => {
  assert.deepEqual(checkMultisigThreshold([1, 2], 3), {
    ok: true,
    satisfied: true,
    totalWeight: 3,
    threshold: 3,
    shortfall: 0,
  });

  assert.deepEqual(checkMultisigThreshold([10, 20, 30], 25), {
    ok: true,
    satisfied: true,
    totalWeight: 60,
    threshold: 25,
    shortfall: 0,
  });
});
