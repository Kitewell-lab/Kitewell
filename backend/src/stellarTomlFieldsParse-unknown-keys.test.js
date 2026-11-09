import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("ignores unknown top-level keys including arrays and numbers", () => {
  const raw = `
VERSION = "2.5.0"
TRANSFER_SERVER = "https://api.example.com/transfer"
ACCOUNTS = ["GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"]
MAX_FEE = 100
HORIZON_URL = "https://horizon-testnet.stellar.org"
`;

  assert.deepEqual(parseStellarTomlFields(raw), {
    HORIZON_URL: "https://horizon-testnet.stellar.org",
  });
});
