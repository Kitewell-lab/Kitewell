import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("accepts a one character code at the minimum boundary", () => {
  assert.equal(isValidAssetCode("A"), true);
});
