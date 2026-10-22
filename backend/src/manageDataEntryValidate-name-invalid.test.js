import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry, MANAGE_DATA_ERROR_CODES } from './manageDataEntryValidate.js';

test('rejects null and undefined data entry name', () => {
  const nullResult = validateManageDataEntry(null, null);
  assert.equal(nullResult.ok, false);
  assert.equal(nullResult.code, MANAGE_DATA_ERROR_CODES.NAME_REQUIRED);

  const undefinedResult = validateManageDataEntry(undefined, null);
  assert.equal(undefinedResult.ok, false);
  assert.equal(undefinedResult.code, MANAGE_DATA_ERROR_CODES.NAME_REQUIRED);
});

test('rejects empty string data entry name', () => {
  const emptyResult = validateManageDataEntry('', null);
  assert.equal(emptyResult.ok, false);
  assert.equal(emptyResult.code, MANAGE_DATA_ERROR_CODES.NAME_EMPTY);
});

test('rejects non-string data entry name', () => {
  const numberResult = validateManageDataEntry(12345, null);
  assert.equal(numberResult.ok, false);
  assert.equal(numberResult.code, MANAGE_DATA_ERROR_CODES.NAME_NOT_STRING);
});
