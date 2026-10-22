import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags, TRUSTLINE_FLAGS } from './trustlineFlagsParse.js';

test('parseTrustlineFlags correctly identifies each individual flag', () => {
  const auth = parseTrustlineFlags(TRUSTLINE_FLAGS.AUTHORIZED);
  assert.equal(auth.authorized, true);
  assert.equal(auth.authorizedToMaintainLiabilities, false);
  assert.equal(auth.clawbackEnabled, false);

  const liab = parseTrustlineFlags(TRUSTLINE_FLAGS.AUTHORIZED_TO_MAINTAIN_LIABILITIES);
  assert.equal(liab.authorized, false);
  assert.equal(liab.authorizedToMaintainLiabilities, true);
  assert.equal(liab.clawbackEnabled, false);

  const claw = parseTrustlineFlags(TRUSTLINE_FLAGS.CLAWBACK_ENABLED);
  assert.equal(claw.authorized, false);
  assert.equal(claw.authorizedToMaintainLiabilities, false);
  assert.equal(claw.clawbackEnabled, true);
});
