import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStellarTomlFields } from './stellarTomlFieldsParse.js';

test('parses all known standard top-level fields from valid stellar.toml', () => {
  const sampleToml = `
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
FEDERATION_SERVER = "https://example.com/federation"
AUTH_SERVER = "https://example.com/auth"
SIGNING_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
HORIZON_URL = "https://horizon-testnet.stellar.org"
  `;

  const parsed = parseStellarTomlFields(sampleToml);

  assert.equal(parsed.NETWORK_PASSPHRASE, 'Test SDF Network ; September 2015');
  assert.equal(parsed.FEDERATION_SERVER, 'https://example.com/federation');
  assert.equal(parsed.AUTH_SERVER, 'https://example.com/auth');
  assert.equal(parsed.SIGNING_KEY, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  assert.equal(parsed.HORIZON_URL, 'https://horizon-testnet.stellar.org');
});
