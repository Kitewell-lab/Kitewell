import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("rejects a locale comma decimal separator", () => {
  assert.equal(toStroops("1,5"), null);
});
