import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields } from './stellarTomlFieldsParse.js';

test('ignores full-line and trailing inline comments', () => {
  const toml = `
# This is a full comment line
NETWORK_PASSPHRASE = "Public" # inline comment here

# Another comment
HORIZON_URL = "https://horizon.stellar.org"
  `;

  const parsed = parseStellarTomlFields(toml);
  assert.equal(parsed.NETWORK_PASSPHRASE, 'Public');
  assert.equal(parsed.HORIZON_URL, 'https://horizon.stellar.org');
});
