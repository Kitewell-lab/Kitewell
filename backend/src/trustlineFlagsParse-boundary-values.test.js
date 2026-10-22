import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags } from './trustlineFlagsParse.js';

test('parseTrustlineFlags handles boundary integer values correctly', () => {
  // Flag 0 (no flags set)
  const zero = parseTrustlineFlags(0);
  assert.equal(zero.raw, 0);
  assert.equal(zero.hasAnyFlag, false);

  // Large bitmask with higher bits (ignored / preserved in raw)
  const highBits = parseTrustlineFlags(15); // 0b1111 -> bits 1, 2, 4 set
  assert.equal(highBits.raw, 15);
  assert.equal(highBits.authorized, true);
  assert.equal(highBits.authorizedToMaintainLiabilities, true);
  assert.equal(highBits.clawbackEnabled, true);
  assert.equal(highBits.hasAnyFlag, true);
});
