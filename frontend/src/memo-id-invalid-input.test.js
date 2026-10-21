import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("rejects malformed id memo input", () => {
  assert.equal(buildIdMemo("12.5").ok, false);
  assert.equal(buildIdMemo("abc").ok, false);
  assert.equal(buildIdMemo("").ok, false);
  assert.equal(buildIdMemo(null).ok, false);
});
