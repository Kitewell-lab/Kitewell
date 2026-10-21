import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("rejects symbols and spaces", () => {
  assert.equal(isValidAssetCode("US-D-C"), false);
  assert.equal(isValidAssetCode("US DC"), false);
});
