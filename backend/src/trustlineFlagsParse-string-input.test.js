import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags } from "./trustlineFlagsParse.js";

test("parses decimal string bitmask input", () => {
  const flags = parseTrustlineFlags("3");
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, true);
  assert.equal(flags.clawbackEnabled, false);
});

test("parses hex string bitmask input", () => {
  const flags = parseTrustlineFlags("0x4");
  assert.equal(flags.clawbackEnabled, true);
});

test("parses BigInt bitmask input", () => {
  const flags = parseTrustlineFlags(7n);
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, true);
  assert.equal(flags.clawbackEnabled, true);
});
