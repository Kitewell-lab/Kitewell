import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage } from './liquidityPoolShareCalc.js';

test('calculates percentage accurately from decimal string representations', () => {
  const result = calcPoolSharePercentage('12.500', '50.0');
  assert.equal(result, '25.0000');
});

test('handles differing decimal fraction lengths without float rounding', () => {
  const result = calcPoolSharePercentage('1.25', '10.0000000');
  assert.equal(result, '12.5000');
});
