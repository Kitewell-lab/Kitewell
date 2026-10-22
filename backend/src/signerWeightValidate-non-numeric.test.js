import test from "node:test";
import assert from "node:assert/strict";

import { checkSignerWeight, validateSignerWeight, InvalidSignerWeightError } from "./signerWeightValidate.js";

test("rejects null and undefined", () => {
  const nullRes = checkSignerWeight(null);
  assert.equal(nullRes.ok, false);
  assert.equal(nullRes.code, "MISSING_WEIGHT");

  const undefRes = checkSignerWeight(undefined);
  assert.equal(undefRes.ok, false);
  assert.equal(undefRes.code, "MISSING_WEIGHT");
});

test("rejects booleans, objects, and arrays", () => {
  assert.equal(checkSignerWeight(true).ok, false);
  assert.equal(checkSignerWeight(false).ok, false);
  assert.equal(checkSignerWeight({ weight: 10 }).ok, false);
  assert.equal(checkSignerWeight([10]).ok, false);
});

test("rejects empty strings and non-numeric strings", () => {
  assert.equal(checkSignerWeight("").ok, false);
  assert.equal(checkSignerWeight("   ").ok, false);
  assert.equal(checkSignerWeight("abc").ok, false);
  assert.equal(checkSignerWeight("10a").ok, false);
});

test("throws InvalidSignerWeightError on validateSignerWeight for invalid types", () => {
  assert.throws(
    () => validateSignerWeight("invalid"),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      return true;
    }
  );
});
