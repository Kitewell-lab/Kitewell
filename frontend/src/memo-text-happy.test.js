import test from "node:test";
import assert from "node:assert/strict";

import { buildHashMemo, buildIdMemo, buildTextMemo } from "./memoBuilder.js";
test("builds a valid text memo", () => {
  const result = buildTextMemo("payment #1");
  assert.deepEqual(result, { ok: true, value: { type: "text", value: "payment #1" } });
});
