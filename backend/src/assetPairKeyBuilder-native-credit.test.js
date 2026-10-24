import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey } from "./assetPairKeyBuilder.js";

test("canonicalizes XLM and native variations uniformly", () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const credit = `USDC:${issuer}`;

  const key1 = buildAssetPairKey("XLM", credit);
  const key2 = buildAssetPairKey("native", credit);
  const key3 = buildAssetPairKey({ asset_type: "native" }, credit);

  assert.equal(key1, `native/${credit}`);
  assert.equal(key2, `native/${credit}`);
  assert.equal(key3, `native/${credit}`);
});
