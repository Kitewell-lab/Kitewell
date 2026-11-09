import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";
import { ORDERBOOK_SPREAD_ERROR } from "./orderbookSpreadCalcConstants.js";

test("handles locked orderbook boundary where top ask equals top bid (0 spread)", () => {
  const result = calculateOrderbookSpread({
    bids: [{ price_r: { n: 5, d: 2 } }],
    asks: [{ price_r: { n: 10, d: 4 } }],
  });

  assert.equal(result.absolute, "0.0000000");
  assert.equal(result.percentage, "0.0000");
  assert.deepEqual(result.rational, { n: 0n, d: 1n });
});

test("rejects crossed orderbooks where top ask is lower than top bid", () => {
  assert.throws(
    () =>
      calculateOrderbookSpread({
        bids: [{ price_r: { n: 105, d: 100 } }],
        asks: [{ price_r: { n: 104, d: 100 } }],
      }),
    {
      name: "RangeError",
      message: ORDERBOOK_SPREAD_ERROR.CROSSED_BOOK,
    },
  );
});
