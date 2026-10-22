import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey, assetPairKeyBuilder } from "./assetPairKeyBuilder.js";

test("accepts options object with base/counter or assetA/assetB", () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const credit = `USDC:${issuer}`;

  const res1 = buildAssetPairKey({ base: credit, counter: "native" });
  assert.equal(res1, `native/${credit}`);

  const res2 = assetPairKeyBuilder({ assetA: "native", assetB: credit });
  assert.equal(res2, `native/${credit}`);
});
