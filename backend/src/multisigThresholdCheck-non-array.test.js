import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("rejects non-array weights input", () => {
  assert.equal(checkMultisigThreshold(null, 10).code, "INVALID_WEIGHTS_TYPE");
  assert.equal(checkMultisigThreshold(undefined, 10).code, "INVALID_WEIGHTS_TYPE");
  assert.equal(checkMultisigThreshold(10, 10).code, "INVALID_WEIGHTS_TYPE");
  assert.equal(checkMultisigThreshold("10,20", 10).code, "INVALID_WEIGHTS_TYPE");
  assert.equal(checkMultisigThreshold({ weight: 10 }, 10).code, "INVALID_WEIGHTS_TYPE");
});
