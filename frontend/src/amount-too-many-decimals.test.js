import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("rejects more than seven decimal places", () => {
  assert.equal(toStroops("1.12345678"), null);
});
