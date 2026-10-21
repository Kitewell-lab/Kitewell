import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("keeps the exact code and issuer spelling for stable keys", () => {
  const key = buildAssetKey({ asset_type: "credit_alphanum4", asset_code: "usdc", asset_issuer: "GISSUER" });
  assert.equal(key, "usdc:GISSUER");
});
