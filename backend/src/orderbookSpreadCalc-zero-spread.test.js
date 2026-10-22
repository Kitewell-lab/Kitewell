import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread } from "./orderbookSpreadCalc.js";

test("computes zero spread when bid and ask are equal", () => {
  const res = calcOrderbookSpread("1.0", "1.0");
  assert.equal(res.absoluteSpread, "0.0000000");
  assert.equal(res.percentageSpread, "0.0000000%");
  assert.equal(res.midPrice, "1.0000000");
  assert.equal(res.isCrossed, false);
});
