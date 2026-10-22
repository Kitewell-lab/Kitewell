import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry, MANAGE_DATA_ERROR_CODES, MAX_VALUE_BYTES } from './manageDataEntryValidate.js';

test('accepts empty 0-byte Buffer value', () => {
  const result = validateManageDataEntry('empty_val_key', Buffer.alloc(0));
  assert.equal(result.ok, true);
  assert.equal(result.valueLength, 0);
});

test('accepts exact 64-byte Buffer value', () => {
  const buf64 = Buffer.alloc(MAX_VALUE_BYTES, 0xff);
  const result = validateManageDataEntry('max_val_key', buf64);
  assert.equal(result.ok, true);
  assert.equal(result.valueLength, 64);
});

test('rejects 65-byte Buffer value with VALUE_TOO_LONG code', () => {
  const buf65 = Buffer.alloc(65, 0xaa);
  const result = validateManageDataEntry('overflow_key', buf65);
  assert.equal(result.ok, false);
  assert.equal(result.code, MANAGE_DATA_ERROR_CODES.VALUE_TOO_LONG);
});

test('rejects base64 string whose decoded byte length exceeds 64 bytes', () => {
  const base64TooLong = Buffer.alloc(65, 'a').toString('base64');
  const result = validateManageDataEntry('base64_overflow', base64TooLong);
  assert.equal(result.ok, false);
  assert.equal(result.code, MANAGE_DATA_ERROR_CODES.VALUE_TOO_LONG);
});
