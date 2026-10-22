import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields } from './stellarTomlFieldsParse.js';

test('unquotes single and double quotes and resolves escaped quotes', () => {
  const toml = `
HORIZON_URL = 'https://horizon.stellar.org'
NETWORK_PASSPHRASE = "Public Global \\"Stellar\\" Network"
  `;

  const parsed = parseStellarTomlFields(toml);
  assert.equal(parsed.HORIZON_URL, 'https://horizon.stellar.org');
  assert.equal(parsed.NETWORK_PASSPHRASE, 'Public Global "Stellar" Network');
});
