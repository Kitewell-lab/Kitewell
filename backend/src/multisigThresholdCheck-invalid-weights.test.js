import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold, InvalidThresholdCheckError } from './multisigThresholdCheck.js';

test('throws on weight value out of bounds or negative', () => {
  assert.throws(() => checkMultisigThreshold([-1], 10), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold([256], 10), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold([{ weight: -5 }], 10), InvalidThresholdCheckError);
});

test('throws on non-array weights input', () => {
  assert.throws(() => checkMultisigThreshold(null, 10), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold(123, 10), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold('not_an_array', 10), InvalidThresholdCheckError);
});
