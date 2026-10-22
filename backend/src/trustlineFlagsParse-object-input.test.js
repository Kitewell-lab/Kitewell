import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags } from './trustlineFlagsParse.js';

test('parseTrustlineFlags unwraps flags property from Horizon account/trustline object', () => {
  const result = parseTrustlineFlags({ flags: 1 });
  assert.equal(result.raw, 1);
  assert.equal(result.authorized, true);
  assert.equal(result.authorizedToMaintainLiabilities, false);
  assert.equal(result.clawbackEnabled, false);
});
