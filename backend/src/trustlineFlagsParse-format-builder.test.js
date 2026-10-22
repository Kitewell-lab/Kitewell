import test from "node:test";
import assert from "node:assert/strict";

import { buildTrustlineFlagsBitmask, parseTrustlineFlags } from "./trustlineFlagsParse.js";

test("builds empty flags mask as 0", () => {
  assert.equal(buildTrustlineFlagsBitmask(), 0);
  assert.equal(buildTrustlineFlagsBitmask({}), 0);
});

test("builds single and multi-flag masks", () => {
  assert.equal(buildTrustlineFlagsBitmask({ authorized: true }), 1);
  assert.equal(buildTrustlineFlagsBitmask({ authorized: true, clawbackEnabled: true }), 5);
  assert.equal(buildTrustlineFlagsBitmask({ authorized: true, authorizedToMaintainLiabilities: true, clawbackEnabled: true }), 7);
});

test("round-trips build and parse seamlessly", () => {
  const original = { authorized: true, authorizedToMaintainLiabilities: true, clawbackEnabled: false };
  const mask = buildTrustlineFlagsBitmask(original);
  const parsed = parseTrustlineFlags(mask);
  assert.equal(parsed.authorized, original.authorized);
  assert.equal(parsed.authorizedToMaintainLiabilities, original.authorizedToMaintainLiabilities);
  assert.equal(parsed.clawbackEnabled, original.clawbackEnabled);
});
