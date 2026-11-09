import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";
import { LIQUIDITY_POOL_SHARE_ERROR } from "./liquidityPoolShareCalcConstants.js";

test("rejects non-object options", () => {
  for (const badOptions of [null, "4", 4, []]) {
    assert.throws(() => calculatePoolSharePercentage(1n, 10n, badOptions), {
      name: "TypeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.OPTIONS_TYPE,
    });
  }
});

test("rejects out-of-range or non-integer precision options", () => {
  for (const badPrecision of [-1, 19, 2.5, "4", NaN]) {
    assert.throws(
      () => calculatePoolSharePercentage(1n, 10n, { precision: badPrecision }),
      {
        name: "RangeError",
        message: LIQUIDITY_POOL_SHARE_ERROR.PRECISION_RANGE,
      },
    );
  }
});

test("rejects unsupported rounding modes", () => {
  for (const badRounding of ["ceil", "floor", "half-even", 123]) {
    assert.throws(
      () => calculatePoolSharePercentage(1n, 10n, { rounding: badRounding }),
      {
        name: "TypeError",
        message: LIQUIDITY_POOL_SHARE_ERROR.ROUNDING_INVALID,
      },
    );
  }
});
