import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";
import {
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from "./multisigThresholdCheckConstants.js";

test("satisfies threshold 0 even with an empty or zero-weight signer list", () => {
  assert.deepEqual(checkMultisigThreshold([], THRESHOLD_MIN), {
    ok: true,
    satisfied: true,
    totalWeight: 0,
    threshold: 0,
    shortfall: 0,
  });

  assert.deepEqual(checkMultisigThreshold([0, 0], THRESHOLD_MIN), {
    ok: true,
    satisfied: true,
    totalWeight: 0,
    threshold: 0,
    shortfall: 0,
  });
});

test("handles maximum threshold 255 and maximum individual weight 255", () => {
  assert.deepEqual(checkMultisigThreshold([255], THRESHOLD_MAX), {
    ok: true,
    satisfied: true,
    totalWeight: 255,
    threshold: 255,
    shortfall: 0,
  });

  assert.deepEqual(checkMultisigThreshold([254], THRESHOLD_MAX), {
    ok: true,
    satisfied: false,
    totalWeight: 254,
    threshold: 255,
    shortfall: 1,
  });
});
