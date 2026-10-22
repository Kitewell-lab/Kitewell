import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry } from './manageDataEntryValidate.js';

test('validates null value as valid delete operation in Stellar manageData', () => {
  const result = validateManageDataEntry('to_delete_key', null);

  assert.equal(result.ok, true);
  assert.equal(result.isDelete, true);
  assert.equal(result.valueLength, 0);
  assert.equal(result.normalizedValue, null);
});

test('validates undefined value as delete operation', () => {
  const result = validateManageDataEntry('to_delete_key', undefined);

  assert.equal(result.ok, true);
  assert.equal(result.isDelete, true);
  assert.equal(result.normalizedValue, null);
});
