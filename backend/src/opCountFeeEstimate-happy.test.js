import test from "node:test";
import assert from "node:assert/strict";

import { estimateOpCountFee } from "./opCountFeeEstimate.js";

test("computes fee with default base fee 100 stroops", () => {
  assert.equal(estimateOpCountFee(1), 100n);
  assert.equal(estimateOpCountFee(5), 500n);
  assert.equal(estimateOpCountFee(10), 1000n);
});

test("computes fee with custom base fee", () => {
  assert.equal(estimateOpCountFee(3, 200), 600n);
  assert.equal(estimateOpCountFee(2, "500"), 1000n);
  assert.equal(estimateOpCountFee(4, 150n), 600n);
});

test("supports string and BigInt operation counts", () => {
  assert.equal(estimateOpCountFee("5"), 500n);
  assert.equal(estimateOpCountFee(7n), 700n);
});
