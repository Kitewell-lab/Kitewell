import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";
import { ORDERBOOK_SPREAD_ERROR } from "./orderbookSpreadCalcConstants.js";

const BOOK = {
  bids: [{ price_r: { n: 90, d: 100 } }],
  asks: [{ price_r: { n: 110, d: 100 } }],
};

test("supports custom pricePrecision, percentagePrecision, and reference (mid, ask, bid)", () => {
  const mid = calculateOrderbookSpread(BOOK, {
    pricePrecision: 2,
    percentagePrecision: 2,
    reference: "mid",
  });
  assert.equal(mid.absolute, "0.20");
  assert.equal(mid.percentage, "20.00");

  const askRef = calculateOrderbookSpread(BOOK, {
    percentagePrecision: 2,
    reference: "ask",
  });
  assert.equal(askRef.percentage, "18.18");

  const bidRef = calculateOrderbookSpread(BOOK, {
    percentagePrecision: 2,
    reference: "bid",
  });
  assert.equal(bidRef.percentage, "22.22");
});

test("rejects invalid options, precisions, or reference values", () => {
  for (const badOpts of [null, "mid", []]) {
    assert.throws(() => calculateOrderbookSpread(BOOK, badOpts), {
      name: "TypeError",
      message: ORDERBOOK_SPREAD_ERROR.OPTIONS_TYPE,
    });
  }

  for (const badPrecision of [-1, 19, 2.5, "4"]) {
    assert.throws(
      () => calculateOrderbookSpread(BOOK, { pricePrecision: badPrecision }),
      {
        name: "RangeError",
        message: ORDERBOOK_SPREAD_ERROR.PRECISION_RANGE,
      },
    );
  }

  assert.throws(
    () => calculateOrderbookSpread(BOOK, { reference: "vwap" }),
    {
      name: "TypeError",
      message: ORDERBOOK_SPREAD_ERROR.INVALID_REFERENCE,
    },
  );
});
