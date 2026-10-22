import test from "node:test";
import assert from "node:assert/strict";

import { estimateTxEnvelopeSize, MEMO_BYTES_MAP } from "./txEnvelopeSizeEstimate.js";

test("computes correct size for each memo type", () => {
  // Base 160 + 72 + 68 = 300
  const noneBytes = estimateTxEnvelopeSize(1, "MEMO_NONE");
  assert.equal(noneBytes, 300 + MEMO_BYTES_MAP.MEMO_NONE);

  const textBytes = estimateTxEnvelopeSize(1, "MEMO_TEXT");
  assert.equal(textBytes, 300 + MEMO_BYTES_MAP.MEMO_TEXT);

  const idBytes = estimateTxEnvelopeSize(1, "MEMO_ID");
  assert.equal(idBytes, 300 + MEMO_BYTES_MAP.MEMO_ID);

  const hashBytes = estimateTxEnvelopeSize(1, "MEMO_HASH");
  assert.equal(hashBytes, 300 + MEMO_BYTES_MAP.MEMO_HASH);

  const returnBytes = estimateTxEnvelopeSize(1, "MEMO_RETURN");
  assert.equal(returnBytes, 300 + MEMO_BYTES_MAP.MEMO_RETURN);
});

test("supports lowercase and shorthand memo type names", () => {
  assert.equal(estimateTxEnvelopeSize(1, "text"), estimateTxEnvelopeSize(1, "MEMO_TEXT"));
  assert.equal(estimateTxEnvelopeSize(1, "id"), estimateTxEnvelopeSize(1, "MEMO_ID"));
  assert.equal(estimateTxEnvelopeSize(1, "hash"), estimateTxEnvelopeSize(1, "MEMO_HASH"));
  assert.equal(estimateTxEnvelopeSize(1, "return"), estimateTxEnvelopeSize(1, "MEMO_RETURN"));
});
