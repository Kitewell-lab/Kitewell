import test from "node:test";
import assert from "node:assert/strict";

import { estimateOpCountFee } from "./opCountFeeEstimate.js";

test("rejects fractional or non-integer operation counts", () => {
  assert.throws(() => estimateOpCountFee(1.5), TypeError);
  assert.throws(() => estimateOpCountFee("2.5"), TypeError);
  assert.throws(() => estimateOpCountFee(0.1), TypeError);
  assert.throws(() => estimateOpCountFee(NaN), TypeError);
  assert.throws(() => estimateOpCountFee(Infinity), TypeError);
});
