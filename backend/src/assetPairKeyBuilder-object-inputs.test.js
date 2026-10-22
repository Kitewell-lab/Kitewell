import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey } from "./assetPairKeyBuilder.js";

test("accepts Horizon-shaped asset objects and normalizes to uppercase", () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const objA = { code: "usdc", issuer };
  const objB = { asset_type: "native" };

  const key = buildAssetPairKey(objA, objB);
  assert.equal(key, `native/USDC:${issuer}`);
});
