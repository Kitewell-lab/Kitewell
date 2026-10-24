import test from "node:test";
import assert from "node:assert/strict";
import { parseAssetPairKey } from "./assetPairKeyBuilder.js";

test("parses a canonical pair key into its two component asset strings", () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const canonicalKey = `native/USDC:${issuer}`;

  const [part1, part2] = parseAssetPairKey(canonicalKey);
  assert.equal(part1, "native");
  assert.equal(part2, `USDC:${issuer}`);
});
