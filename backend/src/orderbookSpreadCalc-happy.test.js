import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";

test("computes absolute and percentage spread from a Horizon orderbook response", () => {
  const result = calculateOrderbookSpread({
    bids: [{ price_r: { n: 99, d: 100 }, price: "0.9900000", amount: "500.0000000" }],
    asks: [{ price_r: { n: 101, d: 100 }, price: "1.0100000", amount: "400.0000000" }],
  });

  assert.deepEqual(result, {
    absolute: "0.0200000",
    percentage: "2.0000",
    bidPrice: "0.9900000",
    askPrice: "1.0100000",
    midPrice: "1.0000000",
    rational: { n: 1n, d: 50n },
  });
});

test("supports orderbook levels containing only decimal price strings", () => {
  const result = calculateOrderbookSpread({
    bids: [{ price: "1.2000000" }],
    asks: [{ price: "1.3000000" }],
  });

  assert.equal(result.absolute, "0.1000000");
  assert.equal(result.percentage, "8.0000");
  assert.deepEqual(result.rational, { n: 1n, d: 10n });
});
