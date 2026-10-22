import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags } from './trustlineFlagsParse.js';

test('parseTrustlineFlags accepts stringified numbers and trims whitespace', () => {
  const result = parseTrustlineFlags('  5  ');
  assert.equal(result.raw, 5);
  assert.equal(result.authorized, true);
  assert.equal(result.clawbackEnabled, true);

  const objWithString = parseTrustlineFlags({ flags: '2' });
  assert.equal(objWithString.raw, 2);
  assert.equal(objWithString.authorizedToMaintainLiabilities, true);
});
