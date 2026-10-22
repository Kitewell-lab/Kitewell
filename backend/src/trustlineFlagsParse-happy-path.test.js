import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags } from './trustlineFlagsParse.js';

test('parseTrustlineFlags parses standard bitmask combinations', () => {
  const parsed0 = parseTrustlineFlags(0);
  assert.equal(parsed0.raw, 0);
  assert.equal(parsed0.authorized, false);
  assert.equal(parsed0.authorizedToMaintainLiabilities, false);
  assert.equal(parsed0.clawbackEnabled, false);
  assert.equal(parsed0.hasAnyFlag, false);

  const parsed7 = parseTrustlineFlags(7);
  assert.equal(parsed7.raw, 7);
  assert.equal(parsed7.authorized, true);
  assert.equal(parsed7.authorizedToMaintainLiabilities, true);
  assert.equal(parsed7.clawbackEnabled, true);
  assert.equal(parsed7.hasAnyFlag, true);
});
