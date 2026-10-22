import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags, STELLAR_ACCOUNT_FLAGS } from "./accountFlagsParse.js";

test("parses AUTH_REQUIRED (1) correctly", () => {
  const flags = parseAccountFlags(STELLAR_ACCOUNT_FLAGS.AUTH_REQUIRED);
  assert.equal(flags.authRequired, true);
  assert.equal(flags.authRevocable, false);
  assert.equal(flags.authImmutable, false);
  assert.equal(flags.authClawbackEnabled, false);
});

test("parses AUTH_REVOCABLE (2) correctly", () => {
  const flags = parseAccountFlags(STELLAR_ACCOUNT_FLAGS.AUTH_REVOCABLE);
  assert.equal(flags.authRequired, false);
  assert.equal(flags.authRevocable, true);
  assert.equal(flags.authImmutable, false);
  assert.equal(flags.authClawbackEnabled, false);
});

test("parses AUTH_IMMUTABLE (4) correctly", () => {
  const flags = parseAccountFlags(STELLAR_ACCOUNT_FLAGS.AUTH_IMMUTABLE);
  assert.equal(flags.authRequired, false);
  assert.equal(flags.authRevocable, false);
  assert.equal(flags.authImmutable, true);
  assert.equal(flags.authClawbackEnabled, false);
});

test("parses AUTH_CLAWBACK_ENABLED (8) correctly", () => {
  const flags = parseAccountFlags(STELLAR_ACCOUNT_FLAGS.AUTH_CLAWBACK_ENABLED);
  assert.equal(flags.authRequired, false);
  assert.equal(flags.authRevocable, false);
  assert.equal(flags.authImmutable, false);
  assert.equal(flags.authClawbackEnabled, true);
});
