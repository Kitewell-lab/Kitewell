import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";
import { ORDERBOOK_SPREAD_ERROR } from "./orderbookSpreadCalcConstants.js";

test("rejects zero or negative denominators and non-positive prices", () => {
  assert.throws(
    () =>
      calculateOrderbookSpread({
        bids: [{ price_r: { n: 10, d: 0 } }],
        asks: [{ price_r: { n: 12, d: 1 } }],
      }),
    {
      name: "RangeError",
      message: ORDERBOOK_SPREAD_ERROR.ZERO_DENOMINATOR,
    },
  );

  for (const nonPositive of [
    { price_r: { n: 0, d: 1 } },
    { price_r: { n: -5, d: 1 } },
    { price: "0.0000000" },
    { price: "-1.0" },
  ]) {
    assert.throws(
      () =>
        calculateOrderbookSpread({
          bids: [nonPositive],
          asks: [{ price_r: { n: 10, d: 1 } }],
        }),
      {
        name: "RangeError",
        message: ORDERBOOK_SPREAD_ERROR.NON_POSITIVE_PRICE,
      },
    );
  }
});

test("rejects malformed price_r or floating-point numbers", () => {
  for (const malformed of [
    null,
    {},
    { price_r: { n: 1.5, d: 1 } },
    { price: "not-a-number" },
  ]) {
    assert.throws(
      () =>
        calculateOrderbookSpread({
          bids: [malformed],
          asks: [{ price_r: { n: 10, d: 1 } }],
        }),
      {
        name: "TypeError",
        message: ORDERBOOK_SPREAD_ERROR.INVALID_PRICE,
      },
    );
  }
});
