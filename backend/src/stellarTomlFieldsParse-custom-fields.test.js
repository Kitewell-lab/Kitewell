import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields } from './stellarTomlFieldsParse.js';

test('supports extracting custom field list passed in options', () => {
  const toml = `
VERSION = "2.0.0"
NETWORK_PASSPHRASE = "Public"
CUSTOM_KEY = "custom_value"
  `;

  const parsed = parseStellarTomlFields(toml, {
    fields: ['VERSION', 'CUSTOM_KEY']
  });

  assert.equal(parsed.VERSION, '2.0.0');
  assert.equal(parsed.CUSTOM_KEY, 'custom_value');
  assert.equal(parsed.NETWORK_PASSPHRASE, undefined);
});
