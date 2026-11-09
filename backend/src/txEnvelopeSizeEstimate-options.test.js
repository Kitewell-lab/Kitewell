import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";
import { TX_ENVELOPE_SIZE_ERROR } from "./txEnvelopeSizeEstimateConstants.js";

test("allows overriding baseEnvelopeBytes and bytesPerOperation via options", () => {
  const result = estimateTxEnvelopeSize(3, "id", {
    baseEnvelopeBytes: 200,
    bytesPerOperation: 80,
  });

  assert.deepEqual(result, {
    ok: true,
    bytes: 200 + 3 * 80 + 8,
    breakdown: {
      baseBytes: 200,
      operationsBytes: 240,
      memoBytes: 8,
      operationCount: 3,
      memoType: "id",
    },
  });
});

test("rejects malformed options or negative/non-integer byte overrides", () => {
  for (const badOptions of [
    null,
    "invalid",
    [],
    { baseEnvelopeBytes: -1 },
    { bytesPerOperation: 12.5 },
    { baseEnvelopeBytes: "180" },
  ]) {
    assert.deepEqual(estimateTxEnvelopeSize(1, "none", badOptions), {
      ok: false,
      error: TX_ENVELOPE_SIZE_ERROR.OPTIONS_TYPE,
    });
  }
});
