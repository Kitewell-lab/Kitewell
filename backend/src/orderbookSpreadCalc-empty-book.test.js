import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";
import { ORDERBOOK_SPREAD_ERROR } from "./orderbookSpreadCalcConstants.js";

test("rejects empty bids or empty asks arrays with RangeError", () => {
  assert.throws(
    () =>
      calculateOrderbookSpread({
        bids: [],
        asks: [{ price_r: { n: 1, d: 1 } }],
      }),
    {
      name: "RangeError",
      message: ORDERBOOK_SPREAD_ERROR.EMPTY_BIDS,
    },
  );

  assert.throws(
    () =>
      calculateOrderbookSpread({
        bids: [{ price_r: { n: 1, d: 1 } }],
        asks: [],
      }),
    {
      name: "RangeError",
      message: ORDERBOOK_SPREAD_ERROR.EMPTY_ASKS,
    },
  );
});
