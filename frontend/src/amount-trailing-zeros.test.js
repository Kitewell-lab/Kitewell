import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("accepts trailing zeros past seven places", () => {
  assert.equal(toStroops("1.5000000"), 15000000);
});
