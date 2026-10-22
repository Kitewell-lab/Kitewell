import test from 'node:test';
import assert from 'node:assert/strict';

import { tryEstimateTxEnvelopeSize, isValidTxEnvelopeParams } from './txEnvelopeSizeEstimate.js';

test('isValidTxEnvelopeParams accurately detects valid vs invalid combinations', () => {
  assert.equal(isValidTxEnvelopeParams(1), true);
  assert.equal(isValidTxEnvelopeParams({ operationCount: 5, memoType: 'text' }), true);
  assert.equal(isValidTxEnvelopeParams(-1), false);
  assert.equal(isValidTxEnvelopeParams(105), false);
  assert.equal(isValidTxEnvelopeParams(1, { memoType: 'bad' }), false);
});

test('tryEstimateTxEnvelopeSize returns result on valid input', () => {
  const result = tryEstimateTxEnvelopeSize(1);
  assert.equal(result.estimatedBytes, 344);
});

test('tryEstimateTxEnvelopeSize returns fallback on invalid input without throwing', () => {
  assert.equal(tryEstimateTxEnvelopeSize(-1), null);
  assert.deepEqual(tryEstimateTxEnvelopeSize(-1, {}, { fallback: 0 }), { fallback: 0 });
});
