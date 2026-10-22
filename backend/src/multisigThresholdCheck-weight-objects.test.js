import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("extracts weights from objects with weight property", () => {
  const signers = [
    { key: "GABC...", weight: 10 },
    { key: "GBBB...", weight: 15 },
  ];

  const res = checkMultisigThreshold(signers, 20);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.totalWeight, 25);
  assert.equal(res.excess, 5);
});

test("supports mixed raw numbers and weight objects", () => {
  const mixed = [10, { weight: 20 }, 5];
  const res = checkMultisigThreshold(mixed, 35);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.totalWeight, 35);
});
