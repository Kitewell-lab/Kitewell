import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread } from "./orderbookSpreadCalc.js";

test("computes spread from Horizon price_r objects", () => {
  const topBid = { price: "0.90", price_r: { n: 9, d: 10 } };
  const topAsk = { price: "1.00", price_r: { n: 1, d: 1 } };

  const res = calcOrderbookSpread(topBid, topAsk);
  assert.equal(res.absoluteSpread, "0.1000000");
  assert.equal(res.percentageSpread, "10.0000000%");
  assert.equal(res.midPrice, "0.9500000");
});

test("computes spread from direct { n, d } ratios", () => {
  const res = calcOrderbookSpread({ n: 1, d: 2 }, { n: 3, d: 4 });
  // Ask = 0.75, Bid = 0.50 => diff = 0.25, percent = (0.25 / 0.75) * 100 = 33.3333333%
  assert.equal(res.absoluteSpread, "0.2500000");
  assert.equal(res.percentageSpread, "33.3333333%");
});
