import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold, isThresholdSatisfied } from './multisigThresholdCheck.js';

test('evaluates satisfied threshold correctly with surplus', () => {
  const result = checkMultisigThreshold([10, 20, 30], 50);

  assert.equal(result.satisfied, true);
  assert.equal(result.totalWeight, 60);
  assert.equal(result.threshold, 50);
  assert.equal(result.surplus, 10);
  assert.equal(result.deficit, 0);

  assert.equal(isThresholdSatisfied([10, 20, 30], 50), true);
});

test('evaluates unsatisfied threshold correctly with deficit', () => {
  const result = checkMultisigThreshold([10, 20], 50);

  assert.equal(result.satisfied, false);
  assert.equal(result.totalWeight, 30);
  assert.equal(result.threshold, 50);
  assert.equal(result.surplus, 0);
  assert.equal(result.deficit, 20);

  assert.equal(isThresholdSatisfied([10, 20], 50), false);
});
