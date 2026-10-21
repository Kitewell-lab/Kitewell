import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetKey, isNativeAssetKey, splitAssetKey } from "./assetKey.js";
test("splits asset keys back into parts", () => {
  assert.deepEqual(splitAssetKey("native"), { type: "native" });
  assert.deepEqual(splitAssetKey("USDC:GISSUER"), { type: "issued", code: "USDC", issuer: "GISSUER" });
  assert.equal(splitAssetKey("nodcolon"), null);
  assert.equal(splitAssetKey(null), null);
});
