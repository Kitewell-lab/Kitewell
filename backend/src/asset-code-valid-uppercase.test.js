import test from "node:test";
import assert from "node:assert/strict";

import { isNativeAssetCode, isValidAssetCode } from "./assetCodeValidate.js";
test("accepts a standard uppercase asset code", () => {
  assert.equal(isValidAssetCode("USDC"), true);
});
