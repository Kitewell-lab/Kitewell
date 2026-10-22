import test from "node:test";
import assert from "node:assert/strict";

import {
  checkSignerWeight,
  validateSignerWeight,
  MIN_SIGNER_WEIGHT,
  MAX_SIGNER_WEIGHT,
} from "./signerWeightValidate.js";

test("accepts boundary values 0 and 255", () => {
  assert.equal(validateSignerWeight(MIN_SIGNER_WEIGHT), 0);
  assert.equal(validateSignerWeight(MAX_SIGNER_WEIGHT), 255);
});

test("rejects immediate boundaries -1 and 256", () => {
  const belowRes = checkSignerWeight(-1);
  assert.equal(belowRes.ok, false);
  assert.equal(belowRes.code, "WEIGHT_BELOW_MINIMUM");

  const aboveRes = checkSignerWeight(256);
  assert.equal(aboveRes.ok, false);
  assert.equal(aboveRes.code, "WEIGHT_ABOVE_MAXIMUM");
});
