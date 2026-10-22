import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds } from "./timeBoundsValidate.js";

test("accepts minTime = 0 and maxTime = 0 (completely unbounded)", () => {
  const bounds = { minTime: 0, maxTime: 0 };
  assert.equal(isValidTimeBounds(bounds), true);

  const result = validateTimeBounds(bounds);
  assert.equal(result.minTime, 0n);
  assert.equal(result.maxTime, 0n);
  assert.equal(result.hasUpperBound, false);
});

test("accepts minTime > 0 and maxTime = 0 (unbounded future)", () => {
  const bounds = { minTime: 1700000000, maxTime: 0 };
  assert.equal(isValidTimeBounds(bounds), true);

  const result = validateTimeBounds(bounds);
  assert.equal(result.minTime, 1700000000n);
  assert.equal(result.maxTime, 0n);
  assert.equal(result.hasUpperBound, false);
});
