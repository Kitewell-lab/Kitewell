import test from "node:test";
import assert from "node:assert/strict";

import {
  checkStellarTomlFields,
  isStellarTomlFieldsParseable,
  parseStellarTomlFields,
} from "./stellarTomlFieldsParse.js";

test("checkStellarTomlFields returns structured result object", () => {
  const toml = `HORIZON_URL = "https://horizon.stellar.org"`;
  const res = checkStellarTomlFields(toml);

  assert.equal(res.ok, true);
  assert.equal(res.fieldCount, 1);
  assert.equal(res.fields.HORIZON_URL, "https://horizon.stellar.org");
  assert.equal(isStellarTomlFieldsParseable(toml), true);
});

test("supports custom allowedFields option", () => {
  const toml = `
CUSTOM_ENDPOINT = "https://custom.endpoint"
HORIZON_URL = "https://horizon.stellar.org"
`;

  const fields = parseStellarTomlFields(toml, {
    allowedFields: ["CUSTOM_ENDPOINT"],
  });

  assert.equal(fields.CUSTOM_ENDPOINT, "https://custom.endpoint");
  assert.equal(fields.HORIZON_URL, undefined);
});
