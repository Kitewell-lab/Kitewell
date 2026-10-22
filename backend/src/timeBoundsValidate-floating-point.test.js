import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds, InvalidTimeBoundsError } from "./timeBoundsValidate.js";

test("rejects floating-point minTime", () => {
  assert.equal(isValidTimeBounds({ minTime: 123.45, maxTime: 500 }), false);
  assert.throws(
    () => validateTimeBounds({ minTime: 123.45, maxTime: 500 }),
    (err) => {
      assert(err instanceof InvalidTimeBoundsError);
      assert.match(err.message, /must be a finite integer/);
      return true;
    }
  );
});

test("rejects floating-point maxTime", () => {
  assert.equal(isValidTimeBounds({ minTime: 100, maxTime: 200.5 }), false);
  assert.throws(
    () => validateTimeBounds({ minTime: 100, maxTime: 200.5 }),
    (err) => {
      assert(err instanceof InvalidTimeBoundsError);
      assert.match(err.message, /must be a finite integer/);
      return true;
    }
  );
});
