import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("stops parsing top-level fields when encountering table headers", () => {
  const toml = `
HORIZON_URL = "https://horizon.main.org"

[DOCUMENTATION]
ORG_NAME = "My Org"
HORIZON_URL = "https://horizon.fake.org"

[[CURRENCIES]]
code = "USDC"
issuer = "GABC..."
`;

  const fields = parseStellarTomlFields(toml);
  assert.equal(fields.HORIZON_URL, "https://horizon.main.org");
  assert.equal(Object.keys(fields).length, 1);
});
