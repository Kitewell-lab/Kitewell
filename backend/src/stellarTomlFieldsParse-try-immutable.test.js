import test from "node:test";
import assert from "node:assert/strict";

import { tryParseStellarTomlFields } from "./stellarTomlFieldsParse.js";
import {
  KNOWN_STELLAR_TOML_FIELDS,
  STELLAR_TOML_PARSE_ERROR,
} from "./stellarTomlFieldsParseConstants.js";

test("tryParseStellarTomlFields returns structured result without throwing", () => {
  assert.deepEqual(
    tryParseStellarTomlFields('SIGNING_KEY = "GABC"'),
    {
      ok: true,
      fields: { SIGNING_KEY: "GABC" },
    },
  );

  assert.deepEqual(tryParseStellarTomlFields(null), {
    ok: false,
    error: STELLAR_TOML_PARSE_ERROR.TYPE,
  });
});

test("exported constants are frozen", () => {
  assert.equal(Object.isFrozen(KNOWN_STELLAR_TOML_FIELDS), true);
  assert.equal(Object.isFrozen(STELLAR_TOML_PARSE_ERROR), true);
});
