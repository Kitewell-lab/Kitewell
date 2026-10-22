import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold } from './multisigThresholdCheck.js';

test('threshold of 0 is always satisfied by any valid weight array', () => {
  const result = checkMultisigThreshold([0], 0);

  assert.equal(result.satisfied, true);
  assert.equal(result.totalWeight, 0);
  assert.equal(result.threshold, 0);
  assert.equal(result.deficit, 0);
  assert.equal(result.surplus, 0);
});
