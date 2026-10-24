import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey, canonicalizeAsset } from "./assetPairKeyBuilder.js";

test("rejects missing, null, or empty asset inputs with TypeError", () => {
  assert.throws(() => buildAssetPairKey(undefined, "native"), TypeError);
  assert.throws(() => buildAssetPairKey("native", null), TypeError);
  assert.throws(() => buildAssetPairKey("", "native"), TypeError);
  assert.throws(() => canonicalizeAsset(12345), TypeError);
});
