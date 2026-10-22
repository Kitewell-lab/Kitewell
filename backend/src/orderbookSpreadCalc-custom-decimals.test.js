import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread } from "./orderbookSpreadCalc.js";

test("computes spread with custom 2 decimal places", () => {
  const res = calcOrderbookSpread("1.95", "2.00", { decimals: 2 });
  assert.equal(res.absoluteSpread, "0.05");
  assert.equal(res.percentageSpread, "2.50%");
  assert.equal(res.midPrice, "1.98");
});

test("computes spread with custom 4 decimal places", () => {
  const res = calcOrderbookSpread("0.999", "1.000", { decimals: 4 });
  assert.equal(res.absoluteSpread, "0.0010");
  assert.equal(res.percentageSpread, "0.1000%");
});
