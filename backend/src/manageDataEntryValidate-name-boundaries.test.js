import test from 'node:test';
import assert from 'node:assert/strict';

import { validateManageDataEntry, MAX_NAME_BYTES } from './manageDataEntryValidate.js';

test('accepts single-character 1-byte name', () => {
  const result = validateManageDataEntry('a', null);
  assert.equal(result.ok, true);
  assert.equal(result.nameLength, 1);
});

test('accepts exact 64-byte ASCII name', () => {
  const maxAsciiName = 'x'.repeat(MAX_NAME_BYTES);
  const result = validateManageDataEntry(maxAsciiName, null);
  assert.equal(result.ok, true);
  assert.equal(result.nameLength, 64);
});

test('accepts multibyte UTF-8 characters up to exactly 64 bytes', () => {
  // Chinese character is 3 bytes in UTF-8: 21 * 3 = 63 bytes + 1 ascii = 64 bytes
  const utf8Name = '星'.repeat(21) + 'a';
  assert.equal(Buffer.byteLength(utf8Name, 'utf8'), 64);

  const result = validateManageDataEntry(utf8Name, null);
  assert.equal(result.ok, true);
  assert.equal(result.nameLength, 64);
});
