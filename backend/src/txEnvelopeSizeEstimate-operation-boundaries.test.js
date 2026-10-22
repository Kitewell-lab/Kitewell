import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateTxEnvelopeSize,
  MAX_OPERATIONS,
  BASE_ENVELOPE_BYTES,
  SIGNATURE_BYTES,
  PER_OPERATION_BYTES,
} from "./txEnvelopeSizeEstimate.js";

test("computes zero-operation envelope baseline", () => {
  // 160 (base) + 0 + 4 (none) + 68 (sig) = 232 bytes
  const bytes = estimateTxEnvelopeSize(0, "MEMO_NONE");
  assert.equal(bytes, BASE_ENVELOPE_BYTES + 4 + SIGNATURE_BYTES);
});

test("computes maximum 100-operation envelope upper bound", () => {
  // 160 + (100 * 72) + 4 + 68 = 160 + 7200 + 4 + 68 = 7432 bytes
  const bytes = estimateTxEnvelopeSize(MAX_OPERATIONS, "MEMO_NONE");
  assert.equal(bytes, 7432);
});
