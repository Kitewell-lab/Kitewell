import test from "node:test";
import assert from "node:assert/strict";

import { estimateOpCountFee } from "./opCountFeeEstimate.js";

test("rejects zero operation count", () => {
  assert.throws(() => estimateOpCountFee(0), RangeError);
  assert.throws(() => estimateOpCountFee("0"), RangeError);
  assert.throws(() => estimateOpCountFee(0n), RangeError);
});

test("rejects negative operation counts", () => {
  assert.throws(() => estimateOpCountFee(-1), RangeError);
  assert.throws(() => estimateOpCountFee("-5"), RangeError);
  assert.throws(() => estimateOpCountFee(-10n), RangeError);
});
