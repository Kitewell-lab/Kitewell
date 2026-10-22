import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields } from './stellarTomlFieldsParse.js';

test('ignores keys located within sub-sections or currency tables', () => {
  const toml = `
FEDERATION_SERVER = "https://root.example.com/federation"

[[CURRENCIES]]
code = "USD"
issuer = "GBB..."
FEDERATION_SERVER = "https://currency.example.com/federation"
  `;

  const parsed = parseStellarTomlFields(toml);
  // Must preserve root level value and ignore sub-table
  assert.equal(parsed.FEDERATION_SERVER, 'https://root.example.com/federation');
});
