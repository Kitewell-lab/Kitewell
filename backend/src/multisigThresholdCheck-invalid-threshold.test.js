import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold, InvalidThresholdCheckError } from './multisigThresholdCheck.js';

test('throws on threshold out of [0, 255] bounds', () => {
  assert.throws(() => checkMultisigThreshold([10], -1), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold([10], 256), InvalidThresholdCheckError);
});

test('throws on non-integer or invalid threshold', () => {
  assert.throws(() => checkMultisigThreshold([10], 10.5), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold([10], 'invalid'), InvalidThresholdCheckError);
  assert.throws(() => checkMultisigThreshold([10], null), InvalidThresholdCheckError);
});
