import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold } from './multisigThresholdCheck.js';

test('boundary threshold of 255 requires exact or higher sum', () => {
  const result = checkMultisigThreshold([255], 255);

  assert.equal(result.satisfied, true);
  assert.equal(result.totalWeight, 255);
  assert.equal(result.threshold, 255);
  assert.equal(result.deficit, 0);
  assert.equal(result.surplus, 0);

  const insufficient = checkMultisigThreshold([100, 154], 255);
  assert.equal(insufficient.satisfied, false);
  assert.equal(insufficient.deficit, 1);
});
