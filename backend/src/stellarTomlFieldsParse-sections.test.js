import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("ignores fields declared inside [DOCUMENTATION] or [[CURRENCIES]] sections", () => {
  const raw = `
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"

[DOCUMENTATION]
ORG_NAME = "Kitewell"
HORIZON_URL = "https://wrong-section.example.com"

[[CURRENCIES]]
code = "USDC"
SIGNING_KEY = "G_INSIDE_CURRENCY_SECTION"
`;

  assert.deepEqual(parseStellarTomlFields(raw), {
    NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  });
});
