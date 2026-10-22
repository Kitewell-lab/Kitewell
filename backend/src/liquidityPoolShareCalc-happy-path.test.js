import test from "node:test";
import assert from "node:assert/strict";

import {
  calcLiquidityPoolShare,
  checkLiquidityPoolShare,
  calcPoolSharePercentage,
} from "./liquidityPoolShareCalc.js";

test("computes exact 50% share across numbers and BigInts", () => {
  assert.equal(calcLiquidityPoolShare(500, 1000), "50.0000");
  assert.equal(calcLiquidityPoolShare(500n, 1000n), "50.0000");
  assert.equal(calcLiquidityPoolShare("500", "1000"), "50.0000");
  assert.equal(calcPoolSharePercentage(500, 1000), "50.0000");
});

test("computes exact 25% share with includeSymbol option", () => {
  const result = calcLiquidityPoolShare(250, 1000, { includeSymbol: true });
  assert.equal(result, "25.0000%");
});

test("computes rounding for one third (33.3333%)", () => {
  const result = calcLiquidityPoolShare(1, 3);
  assert.equal(result, "33.3333");

  const check = checkLiquidityPoolShare(1, 3);
  assert.equal(check.ok, true);
  assert.equal(check.percentage, "33.3333");
});
