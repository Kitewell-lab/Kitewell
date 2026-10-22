import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeBounds, isValidTimeBounds, InvalidTimeBoundsError } from "./timeBoundsValidate.js";

test("rejects negative minTime", () => {
  assert.equal(isValidTimeBounds({ minTime: -1, maxTime: 100 }), false);
  assert.throws(
    () => validateTimeBounds({ minTime: -1, maxTime: 100 }),
    (err) => {
      assert(err instanceof InvalidTimeBoundsError);
      assert.match(err.message, /cannot be negative/);
      return true;
    }
  );
});

test("rejects negative maxTime", () => {
  assert.equal(isValidTimeBounds({ minTime: 0, maxTime: -10 }), false);
  assert.throws(
    () => validateTimeBounds({ minTime: 0, maxTime: -10 }),
    (err) => {
      assert(err instanceof InvalidTimeBoundsError);
      assert.match(err.message, /cannot be negative/);
      return true;
    }
  );
});
