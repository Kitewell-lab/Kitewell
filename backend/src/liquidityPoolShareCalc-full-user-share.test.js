import test from "node:test";
import assert from "node:assert/strict";

import { calcLiquidityPoolShare, checkLiquidityPoolShare } from "./liquidityPoolShareCalc.js";

test("returns 100.0000 when user owns all pool shares", () => {
  assert.equal(calcLiquidityPoolShare(1000, 1000), "100.0000");
  assert.equal(calcLiquidityPoolShare(10000000n, 10000000n), "100.0000");
  assert.equal(calcLiquidityPoolShare("100.5", "100.5"), "100.0000");
  assert.equal(calcLiquidityPoolShare(50, 50, { includeSymbol: true }), "100.0000%");

  const check = checkLiquidityPoolShare(500, 500);
  assert.equal(check.ok, true);
  assert.equal(check.percentage, "100.0000");
});
