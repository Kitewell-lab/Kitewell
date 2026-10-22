import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds } from "./timeBoundsValidate.js";

test("accepts valid bounded interval where minTime < maxTime", () => {
  const bounds = { minTime: 1000, maxTime: 2000 };
  assert.equal(isValidTimeBounds(bounds), true);

  const result = validateTimeBounds(bounds);
  assert.equal(result.minTime, 1000n);
  assert.equal(result.maxTime, 2000n);
  assert.equal(result.hasUpperBound, true);
});

test("accepts point interval where minTime === maxTime", () => {
  const bounds = { minTime: 1700000000, maxTime: 1700000000 };
  assert.equal(isValidTimeBounds(bounds), true);

  const result = validateTimeBounds(bounds);
  assert.equal(result.minTime, 1700000000n);
  assert.equal(result.maxTime, 1700000000n);
  assert.equal(result.hasUpperBound, true);
});

test("accepts positional arguments (minTime, maxTime)", () => {
  assert.equal(isValidTimeBounds(500, 1000), true);
  const result = validateTimeBounds(500, 1000);
  assert.equal(result.minTime, 500n);
  assert.equal(result.maxTime, 1000n);
});
