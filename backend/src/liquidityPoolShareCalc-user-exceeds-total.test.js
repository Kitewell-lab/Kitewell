import test from "node:test";
import assert from "node:assert/strict";

import {
  calcLiquidityPoolShare,
  checkLiquidityPoolShare,
  LiquidityPoolShareCalcError,
} from "./liquidityPoolShareCalc.js";

test("rejects when userShares exceeds totalShares", () => {
  const check = checkLiquidityPoolShare(105, 100);
  assert.equal(check.ok, false);
  assert.equal(check.code, "USER_SHARES_EXCEED_TOTAL");

  assert.throws(
    () => calcLiquidityPoolShare(1001n, 1000n),
    (err) => {
      assert.ok(err instanceof LiquidityPoolShareCalcError);
      assert.equal(err.code, "USER_SHARES_EXCEED_TOTAL");
      return true;
    }
  );

  assert.throws(
    () => calcLiquidityPoolShare("50.1", "50.0"),
    (err) => {
      assert.ok(err instanceof LiquidityPoolShareCalcError);
      assert.equal(err.code, "USER_SHARES_EXCEED_TOTAL");
      return true;
    }
  );
});
