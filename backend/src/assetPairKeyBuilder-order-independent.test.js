import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey } from "./assetPairKeyBuilder.js";

test("builds identical canonical key regardless of argument order", () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const credit = `USDC:${issuer}`;

  const keyAB = buildAssetPairKey("native", credit);
  const keyBA = buildAssetPairKey(credit, "native");

  assert.equal(keyAB, keyBA);
  assert.equal(keyAB, `native/${credit}`);
});
