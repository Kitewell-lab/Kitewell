import test from "node:test";
import assert from "node:assert/strict";

import { calcLiquidityPoolShare, checkLiquidityPoolShare } from "./liquidityPoolShareCalc.js";

test("returns 0.0000 when user has zero shares", () => {
  assert.equal(calcLiquidityPoolShare(0, 1000), "0.0000");
  assert.equal(calcLiquidityPoolShare(0n, 1000n), "0.0000");
  assert.equal(calcLiquidityPoolShare("0", "500.5"), "0.0000");
  assert.equal(calcLiquidityPoolShare("0.00", "1000", { includeSymbol: true }), "0.0000%");

  const check = checkLiquidityPoolShare(0, 1000);
  assert.equal(check.ok, true);
  assert.equal(check.percentage, "0.0000");
});
