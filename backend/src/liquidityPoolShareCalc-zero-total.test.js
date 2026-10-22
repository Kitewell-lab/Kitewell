import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage, InvalidPoolShareError } from './liquidityPoolShareCalc.js';

test('throws InvalidPoolShareError when totalShares is 0', () => {
  assert.throws(() => calcPoolSharePercentage(100, 0), InvalidPoolShareError);
  assert.throws(() => calcPoolSharePercentage('50', '0.000'), InvalidPoolShareError);
  assert.throws(() => calcPoolSharePercentage(0n, 0n), InvalidPoolShareError);
});
