import test from 'node:test';
import assert from 'node:assert/strict';

import { calcPoolSharePercentage } from './liquidityPoolShareCalc.js';

test('calculates share percentage across huge BigInt values without integer overflow', () => {
  const user = 100000000000000000000n;
  const total = 400000000000000000000n;

  const result = calcPoolSharePercentage(user, total);
  assert.equal(result, '25.0000');
});

test('maintains high decimal precision on tiny fraction', () => {
  const result = calcPoolSharePercentage(1n, 1000000000000n, { decimals: 10 });
  assert.equal(result, '0.0000000001');
});
