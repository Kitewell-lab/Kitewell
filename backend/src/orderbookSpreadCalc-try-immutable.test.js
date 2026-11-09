import test from "node:test";
import assert from "node:assert/strict";

import { tryCalculateOrderbookSpread } from "./orderbookSpreadCalc.js";
import {
  ORDERBOOK_SPREAD_ERROR,
  SUPPORTED_SPREAD_REFERENCES,
} from "./orderbookSpreadCalcConstants.js";

test("tryCalculateOrderbookSpread returns ok/spread or ok:false without throwing", () => {
  const okResult = tryCalculateOrderbookSpread({
    bids: [{ price_r: { n: 1, d: 1 } }],
    asks: [{ price_r: { n: 2, d: 1 } }],
  });
  assert.equal(okResult.ok, true);
  assert.equal(okResult.spread.absolute, "1.0000000");

  assert.deepEqual(tryCalculateOrderbookSpread(null), {
    ok: false,
    error: ORDERBOOK_SPREAD_ERROR.ORDERBOOK_TYPE,
  });
});

test("exported constants are frozen", () => {
  assert.equal(Object.isFrozen(ORDERBOOK_SPREAD_ERROR), true);
  assert.equal(Object.isFrozen(SUPPORTED_SPREAD_REFERENCES), true);
});
