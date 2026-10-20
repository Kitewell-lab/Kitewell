import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("accepts a leading zero whole part", () => {
  assert.equal(toStroops("0.0000001"), 1);
});
