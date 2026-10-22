import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFeeBumpFeeDetails,
  formatStroopsToXlm,
} from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFeeDetails returns complete breakdown", () => {
  const details = calculateFeeBumpFeeDetails(1, 100);

  assert.equal(details.feeStroops, 200n);
  assert.equal(details.feeXlm, "0.00002");
  assert.equal(details.innerOpCount, 1n);
  assert.equal(details.effectiveOpCount, 2n);
  assert.equal(details.perOpFeeStroops, 100n);
  assert.equal(details.resourceFeeStroops, 0n);
});

test("formatStroopsToXlm formats integer and fractional XLM accurately", () => {
  assert.equal(formatStroopsToXlm(10_000_000n), "1");
  assert.equal(formatStroopsToXlm(15_000_000n), "1.5");
  assert.equal(formatStroopsToXlm(100n), "0.00001");
  assert.equal(formatStroopsToXlm(0n), "0");
});
