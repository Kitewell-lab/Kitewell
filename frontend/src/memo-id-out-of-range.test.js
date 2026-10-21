import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("rejects id memos outside 0..2^64-1", () => {
  const tooBig = buildIdMemo("18446744073709551616");
  assert.equal(tooBig.ok, false);
  if (tooBig.ok === false) {
    assert.equal(tooBig.error.code, "OUT_OF_RANGE");
  }
  const negative = buildIdMemo(-3);
  assert.equal(negative.ok, false);
});
