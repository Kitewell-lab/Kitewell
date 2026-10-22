import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage } from './liquidityPoolShareCalc.js';

test('returns 0.0000 when userShares is 0 and totalShares is positive', () => {
  const result = calcPoolSharePercentage(0, 1000);
  assert.equal(result, '0.0000');

  const withPercent = calcPoolSharePercentage('0.00', '500.00', { includePercentSign: true });
  assert.equal(withPercent, '0.0000%');
});
