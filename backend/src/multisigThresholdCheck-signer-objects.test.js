import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("accepts Horizon-shaped signer objects containing a numeric weight property", () => {
  const signers = [
    { key: "GAAA", weight: 2, type: "ed25519_public_key" },
    { key: "GBBB", weight: 3, type: "ed25519_public_key" },
  ];

  assert.deepEqual(checkMultisigThreshold(signers, 4), {
    ok: true,
    satisfied: true,
    totalWeight: 5,
    threshold: 4,
    shortfall: 0,
  });
});
