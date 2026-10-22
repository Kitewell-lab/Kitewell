import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateTxEnvelopeSize,
  checkTxEnvelopeSize,
  BASE_ENVELOPE_BYTES,
  PER_OPERATION_BYTES,
  SIGNATURE_BYTES,
} from "./txEnvelopeSizeEstimate.js";

test("computes standard single-operation envelope size with default 1 signature and MEMO_NONE", () => {
  // 160 (base) + 72 (1 op) + 4 (none memo) + 68 (1 sig) = 304 bytes
  const bytes = estimateTxEnvelopeSize(1, "MEMO_NONE");
  assert.equal(bytes, 304);

  const check = checkTxEnvelopeSize(1, "MEMO_NONE");
  assert.equal(check.ok, true);
  assert.equal(check.estimatedBytes, 304);
  assert.equal(check.breakdown.base, BASE_ENVELOPE_BYTES);
  assert.equal(check.breakdown.operations, PER_OPERATION_BYTES);
  assert.equal(check.breakdown.memo, 4);
  assert.equal(check.breakdown.signatures, SIGNATURE_BYTES);
});

test("computes multi-operation envelope size", () => {
  // 160 + (3 * 72) + 4 + 68 = 160 + 216 + 4 + 68 = 448 bytes
  const bytes = estimateTxEnvelopeSize(3, "MEMO_NONE");
  assert.equal(bytes, 448);
});
