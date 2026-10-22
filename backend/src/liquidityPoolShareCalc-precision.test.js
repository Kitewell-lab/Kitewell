import test from "node:test";
import assert from "node:assert/strict";

import { calcLiquidityPoolShare } from "./liquidityPoolShareCalc.js";

test("formats to 2 decimal places when precision is 2", () => {
  assert.equal(calcLiquidityPoolShare(1, 3, { precision: 2 }), "33.33");
  assert.equal(calcLiquidityPoolShare(1, 2, { precision: 2 }), "50.00");
  assert.equal(calcLiquidityPoolShare(2, 3, { precision: 2 }), "66.67");
});

test("formats to integer percentage when precision is 0", () => {
  assert.equal(calcLiquidityPoolShare(50, 100, { precision: 0 }), "50");
  assert.equal(calcLiquidityPoolShare(1, 3, { precision: 0 }), "33");
  assert.equal(calcLiquidityPoolShare(2, 3, { precision: 0 }), "67");
});

test("formats to 6 decimal places when precision is 6", () => {
  assert.equal(calcLiquidityPoolShare(1, 8, { precision: 6 }), "12.500000");
});
