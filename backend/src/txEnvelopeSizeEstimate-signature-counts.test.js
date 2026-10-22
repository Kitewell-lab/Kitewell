import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateTxEnvelopeSize } from './txEnvelopeSizeEstimate.js';

test('scales linearly with number of signatures', () => {
  const oneSig = estimateTxEnvelopeSize(1, { signaturesCount: 1 });
  const threeSigs = estimateTxEnvelopeSize(1, { signaturesCount: 3 });

  // Difference must be exactly 2 * 68 = 136 bytes
  assert.equal(threeSigs.estimatedBytes - oneSig.estimatedBytes, 136);
  assert.equal(threeSigs.signaturesCount, 3);
});
