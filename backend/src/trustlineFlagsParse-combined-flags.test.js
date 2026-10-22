import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags } from './trustlineFlagsParse.js';

test('parseTrustlineFlags correctly identifies combinations of two flags', () => {
  // 1 | 2 = 3 (authorized + maintain liabilities)
  const combo3 = parseTrustlineFlags(3);
  assert.equal(combo3.authorized, true);
  assert.equal(combo3.authorizedToMaintainLiabilities, true);
  assert.equal(combo3.clawbackEnabled, false);

  // 1 | 4 = 5 (authorized + clawback)
  const combo5 = parseTrustlineFlags(5);
  assert.equal(combo5.authorized, true);
  assert.equal(combo5.authorizedToMaintainLiabilities, false);
  assert.equal(combo5.clawbackEnabled, true);

  // 2 | 4 = 6 (liabilities + clawback)
  const combo6 = parseTrustlineFlags(6);
  assert.equal(combo6.authorized, false);
  assert.equal(combo6.authorizedToMaintainLiabilities, true);
  assert.equal(combo6.clawbackEnabled, true);
});
