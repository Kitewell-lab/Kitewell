import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";
import { MULTISIG_THRESHOLD_ERROR } from "./multisigThresholdCheckConstants.js";

test("rejects non-array weights input", () => {
  for (const invalid of [null, undefined, 10, "10", {}, true]) {
    assert.deepEqual(checkMultisigThreshold(invalid, 1), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.WEIGHTS_NOT_ARRAY,
    });
  }
});

test("rejects non-number, non-integer, or out-of-range signer weights", () => {
  for (const badType of ["1", null, undefined, true, 1n, {}, { weight: "2" }]) {
    assert.deepEqual(checkMultisigThreshold([badType], 1), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.WEIGHT_TYPE,
    });
  }

  for (const nonInt of [1.5, NaN, Infinity, -Infinity]) {
    assert.deepEqual(checkMultisigThreshold([nonInt], 1), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.WEIGHT_INTEGER,
    });
  }

  for (const outOfRange of [-1, 256, 1000]) {
    assert.deepEqual(checkMultisigThreshold([outOfRange], 1), {
      ok: false,
      error: MULTISIG_THRESHOLD_ERROR.WEIGHT_RANGE,
    });
  }
});
