import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry } from './manageDataEntryValidate.js';

test('validates standard name and base64 value correctly', () => {
  const name = 'config_key';
  const base64Value = Buffer.from('hello stellar').toString('base64');

  const result = validateManageDataEntry(name, base64Value);

  assert.equal(result.ok, true);
  assert.equal(result.isDelete, false);
  assert.equal(result.nameLength, 10);
  assert.equal(result.valueLength, 13);
  assert.equal(result.normalizedValue.toString('utf8'), 'hello stellar');
});

test('validates standard name with raw Buffer value', () => {
  const name = 'binary_data';
  const bufferValue = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  const result = validateManageDataEntry(name, bufferValue);

  assert.equal(result.ok, true);
  assert.equal(result.isDelete, false);
  assert.equal(result.valueLength, 4);
  assert.deepEqual(result.normalizedValue, bufferValue);
});
