import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("returns null for an unrecognised asset type", () => {
  assert.equal(buildAssetKey({ asset_type: "liquidity_pool_shares" }), null);
  assert.equal(buildAssetKey({ asset_type: "" }), null);
});
