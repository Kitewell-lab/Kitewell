import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertValidManageDataEntry,
  isValidManageDataEntry,
  ManageDataValidationError
} from './manageDataEntryValidate.js';

test('isValidManageDataEntry returns boolean reflecting validity', () => {
  assert.equal(isValidManageDataEntry('good_name', 'valid_val'), true);
  assert.equal(isValidManageDataEntry('', null), false);
  assert.equal(isValidManageDataEntry('a'.repeat(65), null), false);
});

test('assertValidManageDataEntry returns ok result on valid entry', () => {
  const result = assertValidManageDataEntry('valid_key', null);
  assert.equal(result.ok, true);
  assert.equal(result.isDelete, true);
});

test('assertValidManageDataEntry throws ManageDataValidationError on invalid entry', () => {
  assert.throws(
    () => assertValidManageDataEntry(null, null),
    (err) => err instanceof ManageDataValidationError && err.code === 'NAME_REQUIRED'
  );

  assert.throws(
    () => assertValidManageDataEntry('overflow', Buffer.alloc(70)),
    (err) => err instanceof ManageDataValidationError && err.code === 'VALUE_TOO_LONG'
  );
});
