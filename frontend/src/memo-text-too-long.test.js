import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("rejects a text memo of 29 bytes", () => {
  const result = buildTextMemo("A".repeat(29));
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.equal(result.error.code, "TOO_LONG");
  }
});
