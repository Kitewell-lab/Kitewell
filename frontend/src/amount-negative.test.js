import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("rejects a negative amount", () => {
  assert.equal(toStroops("-1.5"), null);
});
