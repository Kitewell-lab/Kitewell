import test from "node:test";
import assert from "node:assert/strict";

import {
  checkSignerWeight,
  validateSignerWeight,
  isValidSignerWeight,
} from "./signerWeightValidate.js";

test("accepts valid numeric signer weights", () => {
  assert.equal(validateSignerWeight(1), 1);
  assert.equal(validateSignerWeight(10), 10);
  assert.equal(validateSignerWeight(100), 100);
  assert.equal(isValidSignerWeight(1), true);

  const res = checkSignerWeight(20);
  assert.equal(res.ok, true);
  assert.equal(res.weight, 20);
  assert.equal(res.isRemoval, false);
});

test("accepts valid integer strings when allowString is true (default)", () => {
  assert.equal(validateSignerWeight("1"), 1);
  assert.equal(validateSignerWeight(" 42 "), 42);
  assert.equal(validateSignerWeight("+10"), 10);
  assert.equal(isValidSignerWeight("100"), true);
});

test("identifies weight 0 as removal operation", () => {
  const res = checkSignerWeight(0);
  assert.equal(res.ok, true);
  assert.equal(res.weight, 0);
  assert.equal(res.isRemoval, true);
});
