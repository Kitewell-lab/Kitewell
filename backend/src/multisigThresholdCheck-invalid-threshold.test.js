import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";
import { MULTISIG_THRESHOLD_ERROR } from "./multisigThresholdCheckConstants.js";

test("rejects non-number, non-integer, or out-of-range threshold values", () => {
  for (const badType of ["2", null, undefined, false, 2n, {}]) {
    assert.deepEqual(checkMultisigThreshold([1], badType), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.THRESHOLD_TYPE,
    });
  }

  for (const nonInt of [2.5, NaN, Infinity, -Infinity]) {
    assert.deepEqual(checkMultisigThreshold([1], nonInt), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.THRESHOLD_INTEGER,
    });
  }

  for (const outOfRange of [-1, 256, -100, 500]) {
    assert.deepEqual(checkMultisigThreshold([1], outOfRange), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.THRESHOLD_RANGE,
    });
  }
});
