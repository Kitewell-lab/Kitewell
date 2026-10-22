import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread } from "./orderbookSpreadCalc.js";

test("flags crossed orderbook when bid is strictly greater than ask", () => {
  // Bid = 2.10, Ask = 2.00 => diff = -0.10
  const res = calcOrderbookSpread("2.10", "2.00");
  assert.equal(res.isCrossed, true);
  assert.equal(res.absoluteSpread, "-0.1000000");
  assert.equal(res.percentageSpread, "-5.0000000%");
});
