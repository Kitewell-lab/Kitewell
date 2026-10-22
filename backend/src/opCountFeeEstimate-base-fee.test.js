import test from "node:test";
import assert from "node:assert/strict";

import { estimateOpCountFee } from "./opCountFeeEstimate.js";

test("accepts 0 stroops base fee", () => {
  assert.equal(estimateOpCountFee(5, 0), 0n);
  assert.equal(estimateOpCountFee(5, 0n), 0n);
});

test("rejects negative base fee", () => {
  assert.throws(() => estimateOpCountFee(5, -100), RangeError);
  assert.throws(() => estimateOpCountFee(5, -1n), RangeError);
});

test("rejects non-integer base fee", () => {
  assert.throws(() => estimateOpCountFee(5, 100.5), TypeError);
  assert.throws(() => estimateOpCountFee(5, "abc"), TypeError);
});
