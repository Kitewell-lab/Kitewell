import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage, InvalidPoolShareError } from './liquidityPoolShareCalc.js';

test('throws on negative userShares or totalShares', () => {
  assert.throws(() => calcPoolSharePercentage(-10, 100), InvalidPoolShareError);
  assert.throws(() => calcPoolSharePercentage(10, -100), InvalidPoolShareError);
});

test('throws on null and undefined values', () => {
  assert.throws(() => calcPoolSharePercentage(null, 100), InvalidPoolShareError);
  assert.throws(() => calcPoolSharePercentage(100, undefined), InvalidPoolShareError);
});

test('throws on non-numeric strings', () => {
  assert.throws(() => calcPoolSharePercentage('invalid', '100'), InvalidPoolShareError);
});

test('throws RangeError on negative decimals', () => {
  assert.throws(() => calcPoolSharePercentage(10, 100, { decimals: -1 }), RangeError);
});
