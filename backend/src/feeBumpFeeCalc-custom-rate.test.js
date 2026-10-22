import test from "node:test";
import assert from "node:assert/strict";
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee applies custom per-operation fee rates", () => {
  // innerOpCount = 1, effectiveOps = 2, rate = 500 => 1000n
  assert.equal(calculateFeeBumpFee(1, 500), 1000n);

  // innerOpCount = 2, effectiveOps = 3, rate = 1000 => 3000n
  assert.equal(calculateFeeBumpFee(2, 1000), 3000n);
});
