import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey } from "./assetPairKeyBuilder.js";

test("orders two credit assets deterministically by alphabetical comparison", () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const btc = `BTC:${issuer}`;
  const usdc = `USDC:${issuer}`;

  const key1 = buildAssetPairKey(usdc, btc);
  const key2 = buildAssetPairKey(btc, usdc);

  assert.equal(key1, `${btc}/${usdc}`);
  assert.equal(key2, `${btc}/${usdc}`);
});
