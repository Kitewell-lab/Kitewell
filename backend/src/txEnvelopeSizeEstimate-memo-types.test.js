import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize, TX_SIZE_CONSTANTS } from './txEnvelopeSizeEstimate.js';

test('memo text, hash, and return add 36 bytes', () => {
  const textResult = estimateTxEnvelopeSize(1, { memoType: 'text' });
  const hashResult = estimateTxEnvelopeSize(1, { memoType: 'hash' });
  const returnResult = estimateTxEnvelopeSize(1, { memoType: 'return' });

  // 200 + 72 + 68 + 36 = 376
  assert.equal(textResult.estimatedBytes, 376);
  assert.equal(hashResult.estimatedBytes, 376);
  assert.equal(returnResult.estimatedBytes, 376);
});

test('memo id adds 12 bytes', () => {
  const idResult = estimateTxEnvelopeSize(1, { memoType: 'id' });
  // 200 + 72 + 68 + 12 = 352
  assert.equal(idResult.estimatedBytes, 352);
});
