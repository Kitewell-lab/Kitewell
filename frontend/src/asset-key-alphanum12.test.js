import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("accepts the twelve character asset type", () => {
  const key = buildAssetKey({ asset_type: "credit_alphanum12", asset_code: "LONGASSET", asset_issuer: "GISSUER" });
  assert.equal(key, "LONGASSET:GISSUER");
});
