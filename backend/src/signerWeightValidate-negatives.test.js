import test from "node:test";
import assert from "node:assert/strict";

import { checkSignerWeight, validateSignerWeight, InvalidSignerWeightError } from "./signerWeightValidate.js";

test("rejects negative numbers and negative numeric strings", () => {
  const resNum = checkSignerWeight(-5);
  assert.equal(resNum.ok, false);
  assert.equal(resNum.code, "WEIGHT_BELOW_MINIMUM");

  const resStr = checkSignerWeight("-10");
  assert.equal(resStr.ok, false);
  assert.equal(resStr.code, "WEIGHT_BELOW_MINIMUM");

  assert.throws(
    () => validateSignerWeight(-100),
    (err) => {
      assert.ok(err instanceof InvalidSignerWeightError);
      assert.equal(err.code, "WEIGHT_BELOW_MINIMUM");
      return true;
    }
  );
});
