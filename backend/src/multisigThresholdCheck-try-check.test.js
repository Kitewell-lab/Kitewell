import test from 'node:test';
import assert from 'node:assert/strict';

import { tryCheckMultisigThreshold } from './multisigThresholdCheck.js';

test('tryCheckMultisigThreshold returns boolean result on valid input', () => {
  assert.equal(tryCheckMultisigThreshold([10, 20], 30), true);
  assert.equal(tryCheckMultisigThreshold([10], 30), false);
});

test('tryCheckMultisigThreshold returns fallback on error without throwing', () => {
  assert.equal(tryCheckMultisigThreshold('bad_weights', 30), false);
  assert.equal(tryCheckMultisigThreshold(null, -5, null), null);
});
