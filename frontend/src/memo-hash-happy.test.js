import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("builds a hash memo and normalizes to lowercase", () => {
  const result = buildHashMemo("ABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB");
  assert.deepEqual(result, {
    ok: true,
    value: { type: "hash", value: "abababababababababababababababababababababababababababababababab" },
  });
});
