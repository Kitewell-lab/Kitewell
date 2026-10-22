import test from "node:test";
import assert from "node:assert/strict";

import {
  parseStellarTomlFields,
  checkStellarTomlFields,
  KNOWN_TOP_LEVEL_FIELDS,
} from "./stellarTomlFieldsParse.js";

test("extracts all known top-level fields from valid stellar.toml string", () => {
  const toml = `
# Network settings
NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015"
HORIZON_URL = "https://horizon.stellar.org"
FEDERATION_SERVER = "https://api.stellar.org/federation"
AUTH_SERVER = "https://api.stellar.org/auth"
SIGNING_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
`;

  const fields = parseStellarTomlFields(toml);
  assert.equal(fields.NETWORK_PASSPHRASE, "Public Global Stellar Network ; September 2015");
  assert.equal(fields.HORIZON_URL, "https://horizon.stellar.org");
  assert.equal(fields.FEDERATION_SERVER, "https://api.stellar.org/federation");
  assert.equal(fields.AUTH_SERVER, "https://api.stellar.org/auth");
  assert.equal(fields.SIGNING_KEY, "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

  const check = checkStellarTomlFields(toml);
  assert.equal(check.ok, true);
  assert.equal(check.fieldCount, 5);
});
