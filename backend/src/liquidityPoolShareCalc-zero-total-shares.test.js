import test from "node:test";
import assert from "node:assert/strict";

import {
  calcLiquidityPoolShare,
  checkLiquidityPoolShare,
  LiquidityPoolShareCalcError,
} from "./liquidityPoolShareCalc.js";

test("rejects totalShares equal to zero", () => {
  const check = checkLiquidityPoolShare(0, 0);
  assert.equal(check.ok, false);
  assert.equal(check.code, "ZERO_TOTAL_SHARES");

  assert.throws(
    () => calcLiquidityPoolShare(10, 0),
    (err) => {
      assert.ok(err instanceof LiquidityPoolShareCalcError);
      assert.equal(err.code, "ZERO_TOTAL_SHARES");
      return true;
    }
  );

  assert.throws(
    () => calcLiquidityPoolShare(0n, 0n),
    (err) => {
      assert.ok(err instanceof LiquidityPoolShareCalcError);
      assert.equal(err.code, "ZERO_TOTAL_SHARES");
      return true;
    }
  );
});
