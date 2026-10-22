import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds, InvalidTimeBoundsError } from "./timeBoundsValidate.js";

test("rejects null or non-object bounds", () => {
  assert.equal(isValidTimeBounds(null), false);
  assert.equal(isValidTimeBounds(undefined), false);
  assert.throws(() => validateTimeBounds(null), InvalidTimeBoundsError);
  assert.throws(() => validateTimeBounds(undefined), InvalidTimeBoundsError);
});

test("rejects missing minTime or maxTime properties", () => {
  assert.equal(isValidTimeBounds({ minTime: 100 }), false);
  assert.equal(isValidTimeBounds({ maxTime: 100 }), false);
  assert.throws(() => validateTimeBounds({ minTime: 100 }), InvalidTimeBoundsError);
  assert.throws(() => validateTimeBounds({ maxTime: 100 }), InvalidTimeBoundsError);
});

test("rejects non-numeric string values containing characters", () => {
  assert.equal(isValidTimeBounds({ minTime: "abc", maxTime: 100 }), false);
  assert.equal(isValidTimeBounds({ minTime: 100, maxTime: "xyz" }), false);
  assert.throws(() => validateTimeBounds({ minTime: "abc", maxTime: 100 }), InvalidTimeBoundsError);
});
