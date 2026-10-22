import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds, InvalidTimeBoundsError } from "./timeBoundsValidate.js";

test("rejects when minTime is strictly greater than positive maxTime", () => {
  const bounds = { minTime: 2000, maxTime: 1000 };
  assert.equal(isValidTimeBounds(bounds), false);

  assert.throws(
    () => validateTimeBounds(bounds),
    (err) => {
      assert(err instanceof InvalidTimeBoundsError);
      assert.match(err.message, /cannot be greater than/);
      return true;
    }
  );
});

test("rejects by a 1-second margin when minTime = maxTime + 1", () => {
  const bounds = { minTime: 1001, maxTime: 1000 };
  assert.equal(isValidTimeBounds(bounds), false);
  assert.throws(() => validateTimeBounds(bounds), InvalidTimeBoundsError);
});
