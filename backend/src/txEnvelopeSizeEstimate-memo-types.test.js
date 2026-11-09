import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";
import { MEMO_TYPE_BYTES } from "./txEnvelopeSizeEstimateConstants.js";

test("adds documented memo payload bytes for each supported memo type", () => {
  for (const [memoType, expectedMemoBytes] of Object.entries(MEMO_TYPE_BYTES)) {
    const result = estimateTxEnvelopeSize(2, memoType);
    assert.equal(result.ok, true);
    assert.equal(result.bytes, 180 + 2 * 64 + expectedMemoBytes);
    assert.equal(result.breakdown.memoBytes, expectedMemoBytes);
    assert.equal(result.breakdown.memoType, memoType);
  }
});

test("normalizes memoType case and surrounding whitespace", () => {
  const result = estimateTxEnvelopeSize(1, "  TEXT ");

  assert.equal(result.ok, true);
  assert.equal(result.bytes, 180 + 64 + 32);
  assert.equal(result.breakdown.memoType, "text");
});
