import test from "node:test";
import assert from "node:assert/strict";

import { checkSignerWeight, validateSignerWeight, InvalidSignerWeightError } from "./signerWeightValidate.js";

test("rejects NaN", () => {
  const res = checkSignerWeight(NaN);
  assert.equal(res.ok, false);
  assert.equal(res.code, "NAN_WEIGHT");

  assert.throws(
    () => validateSignerWeight(NaN),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "NAN_WEIGHT");
      return true;
    }
  );
});

test("rejects Infinity and -Infinity", () => {
  const posInf = checkSignerWeight(Infinity);
  assert.equal(posInf.ok, false);
  assert.equal(posInf.code, "INFINITE_WEIGHT");

  const negInf = checkSignerWeight(-Infinity);
  assert.equal(negInf.ok, false);
  assert.equal(negInf.code, "INFINITE_WEIGHT");

  assert.throws(
    () => validateSignerWeight(Infinity),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "INFINITE_WEIGHT");
      return true;
    }
  );
});
