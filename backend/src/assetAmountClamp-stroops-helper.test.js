import test from "node:test";
import assert from "node:assert/strict";

import {
  amountToStroops,
  STROOPS_PER_UNIT,
  MAX_DECIMAL_PLACES,
} from "./assetAmountClamp.js";

test("converts decimal strings to BigInt stroops correctly", () => {
  assert.equal(amountToStroops("1"), 10_000_000n);
  assert.equal(amountToStroops("1.0"), 10_000_000n);
  assert.equal(amountToStroops("0.0000001"), 1n);
  assert.equal(amountToStroops("12.3456789"), 123_456_789n);
  assert.equal(amountToStroops("0"), 0n);
});

test("passes BigInt values through unchanged", () => {
  assert.equal(amountToStroops(500n), 500n);
});

test("exports correct constants", () => {
  assert.equal(STROOPS_PER_UNIT, 10_000_000n);
  assert.equal(MAX_DECIMAL_PLACES, 7);
});
