import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetPairKey } from "./assetPairKeyBuilder.js";

test("rejects invalid issuer length or non-Stellar public keys", () => {
  // Issuer too short
  assert.throws(() => buildAssetPairKey("native", "USDC:GSHORT"), TypeError);

  // Issuer does not start with G
  assert.throws(
    () =>
      buildAssetPairKey(
        "native",
        `USDC:S${"A".repeat(55)}`,
      ),
    TypeError,
  );

  // Asset code too long (> 12 chars)
  assert.throws(
    () =>
      buildAssetPairKey(
        "native",
        `TOOLONGASSETCODE123:${"G".padEnd(56, "A")}`,
      ),
    TypeError,
  );
});
