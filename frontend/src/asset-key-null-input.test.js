import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("returns null for null or non-object input", () => {
  assert.equal(buildAssetKey(null), null);
  assert.equal(buildAssetKey("USDC"), null);
});
