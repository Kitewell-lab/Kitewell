import test from "node:test";
import assert from "node:assert/strict";

import { assertTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";
import { TX_ENVELOPE_SIZE_ERROR } from "./txEnvelopeSizeEstimateConstants.js";

test("assertTxEnvelopeSize returns numeric byte count on valid input", () => {
  assert.equal(assertTxEnvelopeSize(2, "text"), 180 + 2 * 64 + 32);
});

test("assertTxEnvelopeSize throws Error with stable message on invalid input", () => {
  assert.throws(
    () => assertTxEnvelopeSize(0, "none"),
    new Error(TX_ENVELOPE_SIZE_ERROR.OP_COUNT_RANGE),
  );
  assert.throws(
    () => assertTxEnvelopeSize(1, "unknown"),
    new Error(TX_ENVELOPE_SIZE_ERROR.MEMO_TYPE_UNKNOWN),
  );
});
