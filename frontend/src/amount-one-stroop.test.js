import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("treats a single stroop as the smallest unit", () => {
  assert.equal(toStroops("0.0000001"), 1);
  assert.equal(formatStroops(1), "0.0000001");
});
