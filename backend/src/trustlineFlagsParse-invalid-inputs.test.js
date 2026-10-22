import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustlineFlags } from './trustlineFlagsParse.js';

test('parseTrustlineFlags rejects invalid types, negatives, and floats', () => {
  assert.throws(() => parseTrustlineFlags(-1), {
    name: 'TypeError',
  });

  assert.throws(() => parseTrustlineFlags(1.5), {
    name: 'TypeError',
  });

  assert.throws(() => parseTrustlineFlags('not-a-number'), {
    name: 'TypeError',
  });

  assert.throws(() => parseTrustlineFlags({ notFlags: 1 }), {
    name: 'TypeError',
  });

  assert.throws(() => parseTrustlineFlags(null), {
    name: 'TypeError',
  });

  assert.throws(() => parseTrustlineFlags(undefined), {
    name: 'TypeError',
  });
});
