import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("accepts lowercase letters", () => {
  assert.equal(isValidAssetCode("usdc"), true);
});
