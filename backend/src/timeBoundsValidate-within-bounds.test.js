import test from "node:test";
import assert from "node:assert/strict";

import { isTimeWithinBounds } from "./timeBoundsValidate.js";

test("checks timestamp inside valid bounds window", () => {
  const bounds = { minTime: 1000, maxTime: 2000 };
  assert.equal(isTimeWithinBounds(1500, bounds), true);
  assert.equal(isTimeWithinBounds(1000, bounds), true); // lower boundary inclusive
  assert.equal(isTimeWithinBounds(2000, bounds), true); // upper boundary inclusive
});

test("checks timestamp outside valid bounds window", () => {
  const bounds = { minTime: 1000, maxTime: 2000 };
  assert.equal(isTimeWithinBounds(999, bounds), false);
  assert.equal(isTimeWithinBounds(2001, bounds), false);
});

test("checks timestamp with unbounded maxTime = 0", () => {
  const bounds = { minTime: 1000, maxTime: 0 };
  assert.equal(isTimeWithinBounds(999, bounds), false);
  assert.equal(isTimeWithinBounds(1000, bounds), true);
  assert.equal(isTimeWithinBounds(9999999999, bounds), true);
});
