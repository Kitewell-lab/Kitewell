import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("accepts a bare integer as a whole unit", () => {
  assert.equal(toStroops("5"), 50000000);
});
