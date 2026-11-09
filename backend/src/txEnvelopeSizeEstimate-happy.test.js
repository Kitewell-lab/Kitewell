import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize } from "./txEnvelopeSizeEstimate.js";

test("estimates size for a 1-operation transaction with default memo", () => {
  const result = estimateTxEnvelopeSize(1);

  assert.deepEqual(result, {
    ok: true,
    bytes: 244,
    breakdown: {
      baseBytes: 180,
      operationsBytes: 64,
      memoBytes: 0,
      operationCount: 1,
      memoType: "none",
    },
  });
});

test("scales operation bytes linearly with operationCount", () => {
  const result = estimateTxEnvelopeSize(5, "none");

  assert.deepEqual(result, {
    ok: true,
    bytes: 180 + 5 * 64,
    breakdown: {
      baseBytes: 180,
      operationsBytes: 320,
      memoBytes: 0,
      operationCount: 5,
      memoType: "none",
    },
  });
});
