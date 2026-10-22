import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread, isValidOrderbookPrice } from "./orderbookSpreadCalc.js";

test("computes standard bid-ask spread correctly", () => {
  assert.equal(isValidOrderbookPrice("1.95"), true);
  assert.equal(isValidOrderbookPrice("2.00"), true);

  // Ask = 2.00, Bid = 1.95 => absolute spread = 0.05, percent = (0.05 / 2.00) * 100 = 2.5%
  const res = calcOrderbookSpread("1.95", "2.00");
  assert.equal(res.absoluteSpread, "0.0500000");
  assert.equal(res.percentageSpread, "2.5000000%");
  assert.equal(res.midPrice, "1.9750000");
  assert.equal(res.bid, "1.9500000");
  assert.equal(res.ask, "2.0000000");
  assert.equal(res.isCrossed, false);
});
