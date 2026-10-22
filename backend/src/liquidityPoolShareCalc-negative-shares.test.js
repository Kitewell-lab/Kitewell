import test from "node:test";
import assert from "node:assert/strict";

import {
  calcLiquidityPoolShare,
  checkLiquidityPoolShare,
  LiquidityPoolShareCalcError,
} from "./liquidityPoolShareCalc.js";

test("rejects negative userShares", () => {
  const check = checkLiquidityPoolShare(-10, 100);
  assert.equal(check.ok, false);
  assert.equal(check.code, "NEGATIVE_USER_SHARES");

  assert.throws(
    () => calcLiquidityPoolShare(-5n, 100n),
    (err) => {
      assert.ok(err instanceof LiquidityPoolShareCalcError);
      assert.equal(err.code, "NEGATIVE_USER_SHARES");
      return true;
    }
  );
});

test("rejects negative totalShares", () => {
  const check = checkLiquidityPoolShare(10, -100);
  assert.equal(check.ok, false);
  assert.equal(check.code, "NEGATIVE_TOTAL_SHARES");

  assert.throws(
    () => calcLiquidityPoolShare("10", "-100"),
    (err) => {
      assert.ok(err instanceof LiquidityPoolShareCalcError);
      assert.equal(err.code, "NEGATIVE_TOTAL_SHARES");
      return true;
    }
  );
});
