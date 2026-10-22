import test from "node:test";
import assert from "node:assert/strict";

import { buildAccountFlagsBitmask, parseAccountFlags } from "./accountFlagsParse.js";

test("builds empty flags mask as 0", () => {
  assert.equal(buildAccountFlagsBitmask(), 0);
  assert.equal(buildAccountFlagsBitmask({}), 0);
});

test("builds single and multi-flag masks", () => {
  assert.equal(buildAccountFlagsBitmask({ authRequired: true }), 1);
  assert.equal(buildAccountFlagsBitmask({ authRequired: true, authClawbackEnabled: true }), 9);
  assert.equal(buildAccountFlagsBitmask({ authRequired: true, authRevocable: true, authImmutable: true, authClawbackEnabled: true }), 15);
});

test("round-trips build and parse seamlessly", () => {
  const original = { authRequired: true, authRevocable: false, authImmutable: true, authClawbackEnabled: false };
  const mask = buildAccountFlagsBitmask(original);
  const parsed = parseAccountFlags(mask);
  assert.equal(parsed.authRequired, original.authRequired);
  assert.equal(parsed.authRevocable, original.authRevocable);
  assert.equal(parsed.authImmutable, original.authImmutable);
  assert.equal(parsed.authClawbackEnabled, original.authClawbackEnabled);
});
