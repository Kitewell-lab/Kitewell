import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize, TX_SIZE_CONSTANTS } from './txEnvelopeSizeEstimate.js';

test('calculates correct envelope size for 1 operation and default none memo', () => {
  const result = estimateTxEnvelopeSize(1);

  // 200 (base) + 72 (1 op) + 68 (1 sig) + 4 (none memo) = 344
  assert.equal(result.estimatedBytes, 344);
  assert.equal(result.operationCount, 1);
  assert.equal(result.signaturesCount, 1);
  assert.equal(result.memoType, 'none');
  assert.deepEqual(result.breakdown, {
    base: TX_SIZE_CONSTANTS.BASE_ENVELOPE_BYTES,
    operations: 72,
    signatures: 68,
    memo: 4
  });
});
