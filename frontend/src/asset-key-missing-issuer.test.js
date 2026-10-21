import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("returns null when the issuer is missing or empty", () => {
  assert.equal(buildAssetKey({ asset_type: "credit_alphanum4", asset_code: "USDC" }), null);
  assert.equal(buildAssetKey({ asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "" }), null);
});
