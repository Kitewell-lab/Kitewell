import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("round trips 1.5 through stroops", () => {
  assert.equal(toStroops("1.5"), 15000000);
  assert.equal(formatStroops(15000000), "1.5000000");
});
