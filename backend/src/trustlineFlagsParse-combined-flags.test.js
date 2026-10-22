import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags } from "./trustlineFlagsParse.js";

test("parses combined flags bitmask 3 (authorized + authorizedToMaintainLiabilities)", () => {
  const flags = parseTrustlineFlags(3);
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, true);
  assert.equal(flags.clawbackEnabled, false);
});

test("parses combined flags bitmask 7 (all 3 trustline flags enabled)", () => {
  const flags = parseTrustlineFlags(7);
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, true);
  assert.equal(flags.clawbackEnabled, true);
});

test("parses combined flags bitmask 5 (authorized + clawbackEnabled)", () => {
  const flags = parseTrustlineFlags(5);
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, false);
  assert.equal(flags.clawbackEnabled, true);
});
