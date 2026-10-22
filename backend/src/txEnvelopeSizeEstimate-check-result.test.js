import test from "node:test";
import assert from "node:assert/strict";

import {
  checkTxEnvelopeSize,
  estimateTxEnvelopeSize,
  isValidTxEnvelopeSizeInput,
} from "./txEnvelopeSizeEstimate.js";

test("supports configuration object parameter format", () => {
  const bytes = estimateTxEnvelopeSize({
    operationCount: 2,
    memoType: "MEMO_HASH",
    signatureCount: 2,
  });

  // 160 + (2 * 72) + 36 + (2 * 68) = 160 + 144 + 36 + 136 = 476 bytes
  assert.equal(bytes, 476);
  assert.equal(
    isValidTxEnvelopeSizeInput({
      operationCount: 2,
      memoType: "MEMO_HASH",
      signatureCount: 2,
    }),
    true
  );
});

test("checkTxEnvelopeSize provides full breakdown structure", () => {
  const res = checkTxEnvelopeSize({
    operationCount: 5,
    memoType: "MEMO_ID",
    signatureCount: 1,
  });

  assert.equal(res.ok, true);
  assert.equal(res.operationCount, 5);
  assert.equal(res.memoType, "MEMO_ID");
  assert.equal(res.signatureCount, 1);
  assert.equal(res.breakdown.base, 160);
  assert.equal(res.breakdown.operations, 360);
  assert.equal(res.breakdown.memo, 12);
  assert.equal(res.breakdown.signatures, 68);
  assert.equal(res.estimatedBytes, 600);
});
