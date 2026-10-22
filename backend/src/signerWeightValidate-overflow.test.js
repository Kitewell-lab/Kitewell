import test from "node:test";
import assert from "node:assert/strict";

import { checkSignerWeight, validateSignerWeight, InvalidSignerWeightError } from "./signerWeightValidate.js";

test("rejects weights exceeding maximum limit of 255", () => {
  const res = checkSignerWeight(256);
  assert.equal(res.ok, false);
  assert.equal(res.code, "WEIGHT_ABOVE_MAXIMUM");

  assert.throws(
    () => validateSignerWeight(1000),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "WEIGHT_ABOVE_MAXIMUM");
      return true;
    }
  );

  assert.throws(
    () => validateSignerWeight(Number.MAX_SAFE_INTEGER),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "WEIGHT_ABOVE_MAXIMUM");
      return true;
    }
  );
});

test("rejects string representation of overflow weights", () => {
  const res = checkSignerWeight("9999");
  assert.equal(res.ok, false);
  assert.equal(res.code, "WEIGHT_ABOVE_MAXIMUM");
});
