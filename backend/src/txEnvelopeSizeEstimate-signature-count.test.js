import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateTxEnvelopeSize,
  checkTxEnvelopeSize,
  SIGNATURE_BYTES,
} from "./txEnvelopeSizeEstimate.js";

test("computes unsigned transaction envelope size (0 signatures)", () => {
  // 160 + 72 + 4 + 0 = 236 bytes
  const bytes = estimateTxEnvelopeSize(1, "MEMO_NONE", { signatureCount: 0 });
  assert.equal(bytes, 236);
});

test("computes multisig envelope size with 3 signatures", () => {
  // 160 + 72 + 4 + (3 * 68) = 236 + 204 = 440 bytes
  const bytes = estimateTxEnvelopeSize(1, "MEMO_NONE", 3);
  assert.equal(bytes, 440);
});

test("rejects negative signature count", () => {
  assert.equal(checkTxEnvelopeSize(1, "MEMO_NONE", -1).code, "INVALID_SIGNATURE_COUNT");
});
