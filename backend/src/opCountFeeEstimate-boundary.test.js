import test from "node:test";
import assert from "node:assert/strict";

import { estimateOpCountFee } from "./opCountFeeEstimate.js";

test("computes fee for the minimum valid operation count (1)", () => {
  assert.equal(estimateOpCountFee(1), 100n);
  assert.equal(estimateOpCountFee(1n), 100n);
});

test("handles large operation counts and large base fees without overflow", () => {
  const largeOps = 100_000n;
  const largeBase = 10_000_000n; // 1 XLM per op
  assert.equal(estimateOpCountFee(largeOps, largeBase), 1_000_000_000_000n);
});
