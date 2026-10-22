import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags, isValidTrustlineFlags } from "./trustlineFlagsParse.js";

test("parses bitmask 0 as all flags disabled", () => {
  assert.equal(isValidTrustlineFlags(0), true);

  const parsed = parseTrustlineFlags(0);
  assert.deepEqual(parsed, {
    authorized: false,
    authorizedToMaintainLiabilities: false,
    clawbackEnabled: false,
    raw: 0,
  });
});
