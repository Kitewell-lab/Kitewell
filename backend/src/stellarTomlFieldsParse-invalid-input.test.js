import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";
import { STELLAR_TOML_PARSE_ERROR } from "./stellarTomlFieldsParseConstants.js";

test("throws TypeError on non-string rawToml inputs", () => {
  for (const invalid of [null, undefined, 123, true, {}, ["HORIZON_URL = 'x'"]]) {
    assert.throws(() => parseStellarTomlFields(invalid), {
      name: "TypeError",
      message: STELLAR_TOML_PARSE_ERROR.TYPE,
    });
  }
});
