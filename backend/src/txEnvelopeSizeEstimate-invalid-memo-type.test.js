import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";
import { TX_ENVELOPE_SIZE_ERROR } from "./txEnvelopeSizeEstimateConstants.js";

test("rejects non-string memoType values", () => {
  for (const invalid of [null, 123, false, {}, ["text"]]) {
    assert.deepEqual(estimateTxEnvelopeSize(1, invalid), {
      ok: false,
      error: TX_ENVELOPE_SIZE_ERROR.MEMO_TYPE_TYPE,
    });
  }
});

test("rejects unknown or blank memoType strings", () => {
  for (const invalid of ["", "   ", "memo_text", "binary", "__proto__", "toString"]) {
    assert.deepEqual(estimateTxEnvelopeSize(1, invalid), {
      ok: false,
      error: TX_ENVELOPE_SIZE_ERROR.MEMO_TYPE_UNKNOWN,
    });
  }
});
