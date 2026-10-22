import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize, TX_SIZE_CONSTANTS } from './txEnvelopeSizeEstimate.js';

test('estimates correctly for 0 operations boundary', () => {
  const result = estimateTxEnvelopeSize(0);
  // 200 + 0 + 68 + 4 = 272
  assert.equal(result.estimatedBytes, 272);
  assert.equal(result.operationCount, 0);
});

test('estimates correctly for maximum 100 operations', () => {
  const result = estimateTxEnvelopeSize(TX_SIZE_CONSTANTS.MAX_OPERATIONS);
  // 200 + (100 * 72 = 7200) + 68 + 4 = 7472
  assert.equal(result.estimatedBytes, 7472);
  assert.equal(result.operationCount, 100);
});
