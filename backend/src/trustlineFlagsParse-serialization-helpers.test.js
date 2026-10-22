import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tryParseTrustlineFlags,
  isValidTrustlineFlags,
  serializeTrustlineFlags,
} from './trustlineFlagsParse.js';

test('tryParseTrustlineFlags, isValidTrustlineFlags, and serializeTrustlineFlags work as expected', () => {
  assert.equal(isValidTrustlineFlags(1), true);
  assert.equal(isValidTrustlineFlags('4'), true);
  assert.equal(isValidTrustlineFlags(-1), false);
  assert.equal(isValidTrustlineFlags('invalid'), false);

  assert.equal(tryParseTrustlineFlags('bad', { fallback: true }).fallback, true);
  assert.equal(tryParseTrustlineFlags(1).authorized, true);

  assert.equal(serializeTrustlineFlags({ authorized: true }), 1);
  assert.equal(serializeTrustlineFlags({ authorized: true, clawbackEnabled: true }), 5);
  assert.equal(
    serializeTrustlineFlags({
      authorized: true,
      authorizedToMaintainLiabilities: true,
      clawbackEnabled: true,
    }),
    7
  );
  assert.equal(serializeTrustlineFlags({}), 0);
});
