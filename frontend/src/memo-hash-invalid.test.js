import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("rejects malformed hash memos", () => {
  assert.equal(buildHashMemo("ab".repeat(31)).ok, false);
  assert.equal(buildHashMemo("ab".repeat(64)).ok, false);
  assert.equal(buildHashMemo("zz".repeat(32)).ok, false);
  assert.equal(buildHashMemo(null).ok, false);
});
