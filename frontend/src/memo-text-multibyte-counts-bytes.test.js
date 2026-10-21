import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("counts UTF-8 bytes, not characters, for text memos", () => {
  assert.equal(buildTextMemo("é".repeat(14)).ok, true);
  const tooLong = buildTextMemo("é".repeat(15));
  assert.equal(tooLong.ok, false);
  if (tooLong.ok === false) {
    assert.equal(tooLong.error.code, "TOO_LONG");
  }
});
