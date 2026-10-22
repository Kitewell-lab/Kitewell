import test from 'node:test';
import assert from 'node:assert/strict';

import { tryCalcPoolSharePercentage, isValidPoolShares } from './liquidityPoolShareCalc.js';

test('isValidPoolShares returns boolean reflecting validity', () => {
  assert.equal(isValidPoolShares(100, 1000), true);
  assert.equal(isValidPoolShares('10.5', '100.0'), true);
  assert.equal(isValidPoolShares(100, 0), false);
  assert.equal(isValidPoolShares(-5, 100), false);
  assert.equal(isValidPoolShares(null, 100), false);
});

test('tryCalcPoolSharePercentage returns percentage on valid input', () => {
  assert.equal(tryCalcPoolSharePercentage(50, 100), '50.0000');
});

test('tryCalcPoolSharePercentage returns fallback on error without throwing', () => {
  assert.equal(tryCalcPoolSharePercentage(100, 0), '0.0000');
  assert.equal(tryCalcPoolSharePercentage(null, 100, {}, 'N/A'), 'N/A');
});
