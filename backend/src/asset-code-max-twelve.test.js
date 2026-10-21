import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("accepts twelve characters and rejects thirteen", () => {
  assert.equal(isValidAssetCode("ABCDEFGHIJKL"), true);
  assert.equal(isValidAssetCode("ABCDEFGHIJKLM"), false);
});
