import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize } from './txEnvelopeSizeEstimate.js';

test('supports single object argument signature', () => {
  const result = estimateTxEnvelopeSize({
    operationCount: 3,
    memoType: 'text',
    signaturesCount: 2
  });

  // 200 + (3 * 72 = 216) + (2 * 68 = 136) + 36 = 588
  assert.equal(result.estimatedBytes, 588);
  assert.equal(result.operationCount, 3);
  assert.equal(result.signaturesCount, 2);
  assert.equal(result.memoType, 'text');
});
