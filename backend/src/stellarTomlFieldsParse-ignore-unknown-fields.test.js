import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("ignores unknown keys and only extracts known top-level fields", () => {
  const toml = `
VERSION = "2.0.0"
ORG_NAME = "Example Foundation"
ORG_URL = "https://example.org"
HORIZON_URL = "https://horizon.example.org"
TRANSFER_SERVER = "https://transfer.example.org"
UNKNOWN_CUSTOM_KEY = "ignored_value"
`;

  const fields = parseStellarTomlFields(toml);
  assert.equal(fields.HORIZON_URL, "https://horizon.example.org");
  assert.equal(fields.VERSION, undefined);
  assert.equal(fields.ORG_NAME, undefined);
  assert.equal(fields.ORG_URL, undefined);
  assert.equal(fields.TRANSFER_SERVER, undefined);
  assert.equal(fields.UNKNOWN_CUSTOM_KEY, undefined);
  assert.equal(Object.keys(fields).length, 1);
});
