import test from 'node:test';
import assert from 'node:assert/strict';

import { checkMultisigThreshold } from './multisigThresholdCheck.js';

test('extracts weight from signer objects with { weight } property', () => {
  const signers = [
    { key: 'GA...', weight: 10 },
    { key: 'GB...', weight: '20' },
    { key: 'GC...', weight: 15 }
  ];

  const result = checkMultisigThreshold(signers, 45);

  assert.equal(result.satisfied, true);
  assert.equal(result.totalWeight, 45);
  assert.equal(result.deficit, 0);
  assert.equal(result.surplus, 0);
});
