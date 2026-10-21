import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("maps a native asset to the native key", () => {
  assert.equal(buildAssetKey({ asset_type: "native" }), "native");
});
