import test from 'node:test';
import assert from 'node:assert/strict';

import { tryParseStellarTomlFields, isValidStellarToml } from './stellarTomlFieldsParse.js';

test('isValidStellarToml returns true for strings and false for non-strings', () => {
  assert.equal(isValidStellarToml('NETWORK_PASSPHRASE="foo"'), true);
  assert.equal(isValidStellarToml(''), true);
  assert.equal(isValidStellarToml(null), false);
  assert.equal(isValidStellarToml(1234), false);
});

test('tryParseStellarTomlFields returns parsed fields on valid string', () => {
  const result = tryParseStellarTomlFields('HORIZON_URL="https://horizon.test"');
  assert.equal(result.HORIZON_URL, 'https://horizon.test');
});

test('tryParseStellarTomlFields returns fallback on non-string input without throwing', () => {
  assert.deepEqual(tryParseStellarTomlFields(null), {});
  assert.deepEqual(tryParseStellarTomlFields(undefined, {}, null), null);
});
