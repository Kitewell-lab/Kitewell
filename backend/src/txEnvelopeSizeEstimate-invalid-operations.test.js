import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize, InvalidTxEstimateError } from './txEnvelopeSizeEstimate.js';

test('throws on negative operation count', () => {
  assert.throws(() => estimateTxEnvelopeSize(-1), InvalidTxEstimateError);
});

test('throws on operation count exceeding 100', () => {
  assert.throws(() => estimateTxEnvelopeSize(101), InvalidTxEstimateError);
});

test('throws on non-integer or null/undefined operation count', () => {
  assert.throws(() => estimateTxEnvelopeSize(2.5), InvalidTxEstimateError);
  assert.throws(() => estimateTxEnvelopeSize(null), InvalidTxEstimateError);
  assert.throws(() => estimateTxEnvelopeSize('invalid'), InvalidTxEstimateError);
});
