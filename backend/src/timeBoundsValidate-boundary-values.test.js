import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds } from "./timeBoundsValidate.js";

test("accepts BigInt instances for both bounds", () => {
  const bounds = { minTime: 18446744073709551615n, maxTime: 18446744073709551616n };
  assert.equal(isValidTimeBounds(bounds), true);

  const result = validateTimeBounds(bounds);
  assert.equal(result.minTime, 18446744073709551615n);
  assert.equal(result.maxTime, 18446744073709551616n);
});

test("accepts valid numeric string inputs with leading/trailing spaces", () => {
  const bounds = { minTime: " 1600000000 ", maxTime: "1700000000" };
  assert.equal(isValidTimeBounds(bounds), true);

  const result = validateTimeBounds(bounds);
  assert.equal(result.minTime, 1600000000n);
  assert.equal(result.maxTime, 1700000000n);
});

test("accepts zero as string '0'", () => {
  const bounds = { minTime: "0", maxTime: "0" };
  assert.equal(isValidTimeBounds(bounds), true);
  const result = validateTimeBounds(bounds);
  assert.equal(result.hasUpperBound, false);
});
