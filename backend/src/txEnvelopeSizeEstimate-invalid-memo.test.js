import test from "node:test";
import assert from "node:assert/strict";

import {
  checkTxEnvelopeSize,
  estimateTxEnvelopeSize,
  TxEnvelopeSizeEstimateError,
} from "./txEnvelopeSizeEstimate.js";

test("rejects unsupported memo types", () => {
  const check = checkTxEnvelopeSize(1, "UNSUPPORTED_MEMO");
  assert.equal(check.ok, false);
  assert.equal(check.code, "UNSUPPORTED_MEMO_TYPE");

  assert.throws(
    () => estimateTxEnvelopeSize(1, "invalid_memo"),
    (err) => {
      assert.ok(err instanceof TxEnvelopeSizeEstimateError);
      assert.equal(err.code, "UNSUPPORTED_MEMO_TYPE");
      return true;
    }
  );
});

test("rejects non-string memo types like numbers or objects", () => {
  assert.equal(checkTxEnvelopeSize(1, 123).code, "INVALID_MEMO_TYPE");
  assert.equal(checkTxEnvelopeSize(1, { memo: "text" }).code, "INVALID_MEMO_TYPE");
});
