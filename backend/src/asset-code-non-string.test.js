import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("rejects non-string input", () => {
  assert.equal(isValidAssetCode(null), false);
  assert.equal(isValidAssetCode(42), false);
  assert.equal(isValidAssetCode(undefined), false);
});
