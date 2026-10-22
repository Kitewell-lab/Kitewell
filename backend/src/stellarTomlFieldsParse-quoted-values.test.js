import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("handles double and single quoted strings with escape sequences", () => {
  const toml = `
NETWORK_PASSPHRASE = "Test \\"Network\\""
HORIZON_URL = 'https://horizon-testnet.stellar.org'
`;

  const fields = parseStellarTomlFields(toml);
  assert.equal(fields.NETWORK_PASSPHRASE, 'Test "Network"');
  assert.equal(fields.HORIZON_URL, "https://horizon-testnet.stellar.org");
});

test("handles unquoted simple value tokens", () => {
  const toml = `
HORIZON_URL = https://horizon.unquoted.org
`;
  const fields = parseStellarTomlFields(toml);
  assert.equal(fields.HORIZON_URL, "https://horizon.unquoted.org");
});
