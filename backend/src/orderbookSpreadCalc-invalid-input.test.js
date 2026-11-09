import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";
import { ORDERBOOK_SPREAD_ERROR } from "./orderbookSpreadCalcConstants.js";

test("throws TypeError when orderbook is not an object with bids and asks arrays", () => {
  for (const invalid of [
    null,
    undefined,
    "book",
    123,
    [],
    {},
    { bids: [] },
    { bids: "not-array", asks: [] },
  ]) {
    assert.throws(() => calculateOrderbookSpread(invalid), {
      name: "TypeError",
      message: ORDERBOOK_SPREAD_ERROR.ORDERBOOK_TYPE,
    });
  }
});
