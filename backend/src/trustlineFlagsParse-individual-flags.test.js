import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags, STELLAR_TRUSTLINE_FLAGS } from "./trustlineFlagsParse.js";

test("parses AUTHORIZED (1) correctly", () => {
  const flags = parseTrustlineFlags(STELLAR_TRUSTLINE_FLAGS.AUTHORIZED);
  assert.equal(flags.authorized, true);
  assert.equal(flags.authorizedToMaintainLiabilities, false);
  assert.equal(flags.clawbackEnabled, false);
});

test("parses AUTHORIZED_TO_MAINTAIN_LIABILITIES (2) correctly", () => {
  const flags = parseTrustlineFlags(STELLAR_TRUSTLINE_FLAGS.AUTHORIZED_TO_MAINTAIN_LIABILITIES);
  assert.equal(flags.authorized, false);
  assert.equal(flags.authorizedToMaintainLiabilities, true);
  assert.equal(flags.clawbackEnabled, false);
});

test("parses CLAWBACK_ENABLED (4) correctly", () => {
  const flags = parseTrustlineFlags(STELLAR_TRUSTLINE_FLAGS.CLAWBACK_ENABLED);
  assert.equal(flags.authorized, false);
  assert.equal(flags.authorizedToMaintainLiabilities, false);
  assert.equal(flags.clawbackEnabled, true);
});
