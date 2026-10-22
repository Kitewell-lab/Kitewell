import test from "node:test";
import assert from "node:assert/strict";

import { checkSignerWeight, validateSignerWeight, InvalidSignerWeightError } from "./signerWeightValidate.js";

test("rejects fractional numbers like 0.5 and 10.25", () => {
  const res = checkSignerWeight(0.5);
  assert.equal(res.ok, false);
  assert.equal(res.code, "NON_INTEGER_WEIGHT");

  assert.throws(
    () => validateSignerWeight(10.25),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "NON_INTEGER_WEIGHT");
      return true;
    }
  );
});

test("rejects float string representation like '10.5'", () => {
  const res = checkSignerWeight("10.5");
  assert.equal(res.ok, false);
  assert.equal(res.code, "NON_INTEGER_STRING");
});
