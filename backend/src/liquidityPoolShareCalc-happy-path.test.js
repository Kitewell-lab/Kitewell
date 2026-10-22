import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage } from './liquidityPoolShareCalc.js';

test('calculates exact pool share percentage for standard whole share amounts', () => {
  const result = calcPoolSharePercentage(250, 1000);
  assert.equal(result, '25.0000');
});

test('calculates 100% pool ownership when user holds all shares', () => {
  const result = calcPoolSharePercentage(500, 500, { includePercentSign: true });
  assert.equal(result, '100.0000%');
});
