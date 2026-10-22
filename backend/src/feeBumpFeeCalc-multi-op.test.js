import test from "node:test";
import assert from "node:assert/strict";
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee calculates multi-operation transaction fee accurately", () => {
  // innerOpCount = 10, effectiveOps = 11, rate = 100 => 1100n
  assert.equal(calculateFeeBumpFee(10, 100), 1100n);

  // innerOpCount = 100, effectiveOps = 101, rate = 100 => 10100n
  assert.equal(calculateFeeBumpFee(100, 100), 10100n);
});
