import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";
import {
  MAX_OPERATIONS,
  MIN_OPERATIONS,
  TX_ENVELOPE_SIZE_ERROR,
} from "./txEnvelopeSizeEstimateConstants.js";

test("accepts minimum (1) and maximum (100) operation counts", () => {
  const minResult = estimateTxEnvelopeSize(MIN_OPERATIONS, "id");
  assert.equal(minResult.ok, true);
  assert.equal(minResult.bytes, 180 + 64 + 8);

  const maxResult = estimateTxEnvelopeSize(MAX_OPERATIONS, "hash");
  assert.equal(maxResult.ok, true);
  assert.equal(maxResult.bytes, 180 + 100 * 64 + 32);
});

test("rejects 0 and 101 operations at the protocol boundary", () => {
  assert.deepEqual(estimateTxEnvelopeSize(MIN_OPERATIONS - 1, "none"), {
    ok: false,
    error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_RANGE,
  });
  assert.deepEqual(estimateTxEnvelopeSize(MAX_OPERATIONS + 1, "none"), {
    ok: false,
    error: TX_ENVELOPE_SIZE_ERROR.OP_COUNT_RANGE,
  });
});
