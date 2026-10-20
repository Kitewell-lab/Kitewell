import test from "node:test";
import assert from "node:assert/strict";

import { formatStroops, toStroops } from "./amountFormat.js";
test("rejects an empty string", () => {
  assert.equal(toStroops(""), null);
});
