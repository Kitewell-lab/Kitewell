import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateTxEnvelopeSize,
  checkTxEnvelopeSize,
  TxEnvelopeSizeEstimateError,
} from "./txEnvelopeSizeEstimate.js";

test("rejects operationCount exceeding 100", () => {
  const check = checkTxEnvelopeSize(101, "MEMO_NONE");
  assert.equal(check.ok, false);
  assert.equal(check.code, "MAX_OPERATIONS_EXCEEDED");

  assert.throws(
    () => estimateTxEnvelopeSize(101, "MEMO_NONE"),
    (err) => {
      assert.ok(err instanceof TxEnvelopeSizeEstimateError);
      assert.equal(err.code, "MAX_OPERATIONS_EXCEEDED");
      return true;
    }
  );

  assert.throws(
    () => estimateTxEnvelopeSize(500),
    (err) => {
      assert.ok(err instanceof TxEnvelopeSizeEstimateError);
      return true;
    }
  );
});
