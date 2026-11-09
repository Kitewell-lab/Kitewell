import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";
import { TX_ENVELOPE_SIZE_ERROR } from "./txEnvelopeSizeEstimateConstants.js";

test("rejects non-number operationCount values without coercion", () => {
  for (const invalid of ["1", null, undefined, true, 1n, {}, [1]]) {
    assert.deepEqual(estimateTxEnvelopeSize(invalid, "none"), {
      ok: false,
      error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_TYPE,
    });
  }
});

test("rejects fractional and non-finite operationCount values", () => {
  for (const invalid of [1.5, NaN, Infinity, -Infinity]) {
    assert.deepEqual(estimateTxEnvelopeSize(invalid, "none"), {
      ok: false,
      error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_INTEGER,
    });
  }
});

test("rejects negative operationCount values", () => {
  assert.deepEqual(estimateTxEnvelopeSize(-5, "none"), {
    ok: false,
    error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_RANGE,
  });
});
