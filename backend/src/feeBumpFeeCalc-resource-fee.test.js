import test from "node:test";
import assert from "node:assert/strict";
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee includes optional resource fee", () => {
  // innerOpCount = 1, effectiveOps = 2, rate = 100, resourceFee = 50000 => 200 + 50000 = 50200n
  const fee = calculateFeeBumpFee(1, 100, { resourceFee: 50000 });
  assert.equal(fee, 50200n);
});

test("calculateFeeBumpFee accepts resourceFee as BigInt or string", () => {
  const fee1 = calculateFeeBumpFee(2, 100, { resourceFee: 1000n });
  assert.equal(fee1, 1300n);

  const fee2 = calculateFeeBumpFee(2, 100, { resourceFee: "250" });
  assert.equal(fee2, 550n);
});
