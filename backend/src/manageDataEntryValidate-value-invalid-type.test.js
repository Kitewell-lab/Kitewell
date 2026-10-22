import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry, MANAGE_DATA_ERROR_CODES } from './manageDataEntryValidate.js';

test('rejects number, boolean, and plain object as data entry value', () => {
  const numResult = validateManageDataEntry('my_key', 12345);
  assert.equal(numResult.ok, false);
  assert.equal(numResult.code, MANAGE_DATA_ERROR_CODES.VALUE_INVALID_TYPE);

  const boolResult = validateManageDataEntry('my_key', true);
  assert.equal(boolResult.ok, false);
  assert.equal(boolResult.code, MANAGE_DATA_ERROR_CODES.VALUE_INVALID_TYPE);

  const objResult = validateManageDataEntry('my_key', { foo: 'bar' });
  assert.equal(objResult.ok, false);
  assert.equal(objResult.code, MANAGE_DATA_ERROR_CODES.VALUE_INVALID_TYPE);
});

test('rejects invalid base64 string when allowRawString is disabled', () => {
  const result = validateManageDataEntry('my_key', '!!!not_valid_base64!!!', { allowRawString: false });
  assert.equal(result.ok, false);
  assert.equal(result.code, MANAGE_DATA_ERROR_CODES.VALUE_INVALID_BASE64);
});
