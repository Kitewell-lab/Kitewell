import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";
import { LIQUIDITY_POOL_SHARE_ERROR } from "./liquidityPoolShareCalcConstants.js";

test("rejects zero or negative totalShares with RangeError", () => {
  for (const nonPositive of [0n, 0, "0", "0.0000000", -1n, -10, "-5.0"]) {
    assert.throws(() => calculatePoolSharePercentage(0n, nonPositive), {
      name: "RangeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.TOTAL_NON_POSITIVE,
    });
  }
});

test("rejects invalid totalShares types and malformed strings", () => {
  for (const invalid of [null, undefined, false, 2.5, NaN, {}]) {
    assert.throws(() => calculatePoolSharePercentage(1n, invalid), {
      name: "TypeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.TOTAL_TYPE,
    });
  }
  for (const badStr of ["", "not-a-number", "10.12345678"]) {
    assert.throws(() => calculatePoolSharePercentage(1n, badStr), {
      name: "TypeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.TOTAL_FORMAT,
    });
  }
});
