import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("builds id memos from numbers and digit strings", () => {
  const fromNumber = buildIdMemo(42);
  assert.deepEqual(fromNumber, { ok: true, value: { type: "id", value: "42" } });
  const fromString = buildIdMemo("123456789");
  assert.deepEqual(fromString, { ok: true, value: { type: "id", value: "123456789" } });
});
