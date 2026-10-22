import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize, InvalidTxEstimateError } from './txEnvelopeSizeEstimate.js';

test('throws on unsupported memo type', () => {
  assert.throws(() => estimateTxEnvelopeSize(1, { memoType: 'unsupported_type' }), InvalidTxEstimateError);
  assert.throws(() => estimateTxEnvelopeSize(1, { memoType: 123 }), InvalidTxEstimateError);
});

test('throws on out-of-range signature count', () => {
  assert.throws(() => estimateTxEnvelopeSize(1, { signaturesCount: 0 }), InvalidTxEstimateError);
  assert.throws(() => estimateTxEnvelopeSize(1, { signaturesCount: 25 }), InvalidTxEstimateError);
});
