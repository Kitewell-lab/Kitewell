import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("accepts a text memo of exactly 28 bytes", () => {
  const result = buildTextMemo("A".repeat(28));
  assert.equal(result.ok, true);
  assert.equal(result.value.type, "text");
});
