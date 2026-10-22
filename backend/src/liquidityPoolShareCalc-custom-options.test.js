import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage } from './liquidityPoolShareCalc.js';

test('supports custom decimal precision', () => {
  const result = calcPoolSharePercentage(1, 3, { decimals: 6 });
  assert.equal(result, '33.333333');
});

test('supports trimTrailingZeros option', () => {
  const result = calcPoolSharePercentage(25, 100, { decimals: 4, trimTrailingZeros: true });
  assert.equal(result, '25');
});

test('supports 0 decimals rounding to nearest integer', () => {
  const result = calcPoolSharePercentage(255, 1000, { decimals: 0 });
  assert.equal(result, '26');
});
