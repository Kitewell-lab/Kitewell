import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields } from './stellarTomlFieldsParse.js';

test('ignores unknown and custom fields outside standard list', () => {
  const toml = `
VERSION = "2.0.0"
NETWORK_PASSPHRASE = "Public Global Stellar"
ORGANIZATION_NAME = "My Company"
CUSTOM_API_KEY = "123456"
  `;

  const parsed = parseStellarTomlFields(toml);
  assert.equal(parsed.NETWORK_PASSPHRASE, 'Public Global Stellar');
  assert.equal(parsed.VERSION, undefined);
  assert.equal(parsed.ORGANIZATION_NAME, undefined);
  assert.equal(parsed.CUSTOM_API_KEY, undefined);
});
