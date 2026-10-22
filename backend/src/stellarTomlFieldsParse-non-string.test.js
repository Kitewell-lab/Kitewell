import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields, InvalidStellarTomlError } from './stellarTomlFieldsParse.js';

test('throws InvalidStellarTomlError when input is not a string', () => {
  assert.throws(() => parseStellarTomlFields(null), InvalidStellarTomlError);
  assert.throws(() => parseStellarTomlFields(undefined), InvalidStellarTomlError);
  assert.throws(() => parseStellarTomlFields(12345), InvalidStellarTomlError);
  assert.throws(() => parseStellarTomlFields({}), InvalidStellarTomlError);
});
