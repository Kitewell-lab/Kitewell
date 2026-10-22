import test from "node:test";
import assert from "node:assert/strict";

import { estimateFeeDetails } from "./opCountFeeEstimate.js";

test("returns structured fee details with XLM string conversion", () => {
  const result = estimateFeeDetails(10, 100);
  assert.deepEqual(result, {
    feeStroops: 1000n,
    feeXlm: "0.0001",
    operationCount: 10n,
    baseFeeStroops: 100n,
  });
});

test("formats whole XLM fee values cleanly", () => {
  // 100,000 ops * 100 stroops = 10,000,000 stroops = 1 XLM
  const result = estimateFeeDetails(100_000, 100);
  assert.equal(result.feeStroops, 10_000_000n);
  assert.equal(result.feeXlm, "1");
});
