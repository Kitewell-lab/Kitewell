import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("identifies native keys", () => {
  assert.equal(isNativeAssetKey("native"), true);
  assert.equal(isNativeAssetKey("XLM:GISSUER"), false);
  assert.equal(isNativeAssetKey(undefined), false);
});
