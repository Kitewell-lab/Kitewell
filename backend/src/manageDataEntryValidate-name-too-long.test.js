import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry, MANAGE_DATA_ERROR_CODES } from './manageDataEntryValidate.js';

test('rejects 65-byte ASCII name with NAME_TOO_LONG code', () => {
  const tooLongName = 'a'.repeat(65);
  const result = validateManageDataEntry(tooLongName, null);

  assert.equal(result.ok, false);
  assert.equal(result.code, MANAGE_DATA_ERROR_CODES.NAME_TOO_LONG);
});

test('rejects multibyte UTF-8 name whose byte length exceeds 64', () => {
  // 22 * 3 = 66 bytes (> 64)
  const tooLongUtf8 = '星'.repeat(22);
  const result = validateManageDataEntry(tooLongUtf8, null);

  assert.equal(result.ok, false);
  assert.equal(result.code, MANAGE_DATA_ERROR_CODES.NAME_TOO_LONG);
});
