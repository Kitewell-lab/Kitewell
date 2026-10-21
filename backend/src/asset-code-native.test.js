import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("identifies native asset codes", () => {
  assert.equal(isNativeAssetCode("XLM"), true);
  assert.equal(isNativeAssetCode("native"), true);
  assert.equal(isNativeAssetCode("USDC"), false);
  assert.equal(isNativeAssetCode(null), false);
});
