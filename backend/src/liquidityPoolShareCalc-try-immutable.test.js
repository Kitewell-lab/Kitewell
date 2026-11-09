import test from "node:test";
import assert from "node:assert/strict";

import { tryCalculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";
import {
  LIQUIDITY_POOL_SHARE_ERROR,
  SUPPORTED_ROUNDING_MODES,
} from "./liquidityPoolShareCalcConstants.js";

test("tryCalculatePoolSharePercentage returns ok result or error without throwing", () => {
  assert.deepEqual(tryCalculatePoolSharePercentage("50", "200"), {
    ok: true,
    percentage: "25.0000",
  });

  assert.deepEqual(tryCalculatePoolSharePercentage("50", "0"), {
    ok: false,
    error: LIQUIDITY_POOL_SHARE_ERROR.TOTAL_NON_POSITIVE,
  });
});

test("exported constants are frozen", () => {
  assert.equal(Object.isFrozen(LIQUIDITY_POOL_SHARE_ERROR), true);
  assert.equal(Object.isFrozen(SUPPORTED_ROUNDING_MODES), true);
});
