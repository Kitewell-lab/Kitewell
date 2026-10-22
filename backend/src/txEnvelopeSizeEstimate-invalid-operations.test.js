import test from "node:test";
import assert from "node:assert/strict";

import {
  checkTxEnvelopeSize,
  estimateTxEnvelopeSize,
  TxEnvelopeSizeEstimateError,
} from "./txEnvelopeSizeEstimate.js";

test("rejects negative operationCount", () => {
  const check = checkTxEnvelopeSize(-1, "MEMO_NONE");
  assert.equal(check.ok, false);
  assert.equal(check.code, "NEGATIVE_OPERATION_COUNT");

  assert.throws(
    () => estimateTxEnvelopeSize(-5),
    (err) => {
      assert.ok(err instanceof TxEnvelopeSizeEstimateError);
      assert.equal(err.code, "NEGATIVE_OPERATION_COUNT");
      return true;
    }
  );
});

test("rejects non-integer operationCount", () => {
  const check = checkTxEnvelopeSize(1.5, "MEMO_NONE");
  assert.equal(check.ok, false);
  assert.equal(check.code, "NON_INTEGER_OPERATION_COUNT");
});

test("rejects non-numeric operationCount like NaN, Infinity, strings, and null", () => {
  assert.equal(checkTxEnvelopeSize(NaN).code, "INVALID_OPERATION_COUNT");
  assert.equal(checkTxEnvelopeSize(Infinity).code, "INVALID_OPERATION_COUNT");
  assert.equal(checkTxEnvelopeSize("1").code, "INVALID_OPERATION_COUNT");
});
