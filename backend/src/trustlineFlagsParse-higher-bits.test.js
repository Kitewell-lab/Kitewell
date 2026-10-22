import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags } from "./trustlineFlagsParse.js";

test("preserves lower flags when higher unassigned bits are set", () => {
  // 9 = 8 (0x8) + 1 (authorized)
  const flags = parseTrustlineFlags(9);
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, false);
  assert.equal(flags.clawbackEnabled, false);
  assert.equal(flags.raw, 9);
});

test("accurately records raw number when only high bits are set", () => {
  const flags = parseTrustlineFlags(16);
  assert.equal(flags.authorized, false);
  assert.equal(flags.raw, 16);
});
