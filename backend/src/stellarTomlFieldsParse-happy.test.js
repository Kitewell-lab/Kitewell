import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("extracts all 5 known top-level stellar.toml fields", () => {
  const raw = `
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
FEDERATION_SERVER = "https://api.example.com/federation"
AUTH_SERVER = "https://api.example.com/auth"
SIGNING_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
HORIZON_URL = "https://horizon-testnet.stellar.org"
`;

  assert.deepEqual(parseStellarTomlFields(raw), {
    NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    FEDERATION_SERVER: "https://api.example.com/federation",
    AUTH_SERVER: "https://api.example.com/auth",
    SIGNING_KEY: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    HORIZON_URL: "https://horizon-testnet.stellar.org",
  });
});

test("supports single-quoted strings and CRLF line endings", () => {
  const raw =
    "NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015'\r\nHORIZON_URL = 'https://horizon.stellar.org'\r\n";

  assert.deepEqual(parseStellarTomlFields(raw), {
    NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015",
    HORIZON_URL: "https://horizon.stellar.org",
  });
});
