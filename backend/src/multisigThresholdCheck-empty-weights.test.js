import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold } from './multisigThresholdCheck.js';

test('empty weights list yields totalWeight 0, satisfying 0 threshold', () => {
  const result = checkMultisigThreshold([], 0);

  assert.equal(result.satisfied, true);
  assert.equal(result.totalWeight, 0);
  assert.equal(result.threshold, 0);
  assert.equal(result.deficit, 0);
  assert.equal(result.surplus, 0);
});

test('empty weights list fails non-zero threshold', () => {
  const result = checkMultisigThreshold([], 1);

  assert.equal(result.satisfied, false);
  assert.equal(result.totalWeight, 0);
  assert.equal(result.deficit, 1);
});
