import test from "node:test";
import assert from "node:assert/strict";

import {
  checkSignerWeight,
  assertSignerWeight,
  InvalidSignerWeightError,
} from "./signerWeightValidate.js";

test("checkSignerWeight returns structured typed result on success", () => {
  const result = checkSignerWeight(50);
  assert.equal(result.ok, true);
  assert.equal(result.weight, 50);
  assert.equal(result.isRemoval, false);
});

test("checkSignerWeight returns structured typed result on error", () => {
  const result = checkSignerWeight("bad_string");
  assert.equal(result.ok, false);
  assert.equal(result.code, "NON_INTEGER_STRING");
  assert.ok(typeof result.error === "string");
  assert.ok(result.details !== undefined);
});

test("respects { allowString: false } option", () => {
  const res = checkSignerWeight("10", { allowString: false });
  assert.equal(res.ok, false);
  assert.equal(res.code, "INVALID_WEIGHT_TYPE");
});

test("assertSignerWeight alias works identically to validateSignerWeight", () => {
  assert.equal(assertSignerWeight(10), 10);

  assert.throws(
    () => assertSignerWeight(300),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "WEIGHT_ABOVE_MAXIMUM");
      return true;
    }
  );
});
