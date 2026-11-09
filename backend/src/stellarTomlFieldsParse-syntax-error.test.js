import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";
import { STELLAR_TOML_PARSE_ERROR } from "./stellarTomlFieldsParseConstants.js";

test("rejects malformed lines, unclosed section headers, and duplicate top-level keys", () => {
  for (const badSyntax of [
    "INVALID_LINE_WITHOUT_EQUALS",
    "= \"missing_key\"",
    "[UNCLOSED_SECTION",
    "[]",
    "[[]]",
  ]) {
    assert.throws(
      () => parseStellarTomlFields(badSyntax),
      new Error(STELLAR_TOML_PARSE_ERROR.SYNTAX),
    );
  }

  assert.throws(
    () =>
      parseStellarTomlFields(
        'HORIZON_URL = "https://a.example"\nHORIZON_URL = "https://b.example"',
      ),
    new RegExp(STELLAR_TOML_PARSE_ERROR.DUPLICATE_KEY),
  );
});

test("rejects unquoted or unclosed values on known top-level fields", () => {
  for (const badValue of [
    "HORIZON_URL = https://horizon.stellar.org",
    "HORIZON_URL = 12345",
    'HORIZON_URL = "https://unclosed.example',
    'HORIZON_URL = "https://ok.example" trailing_garbage',
  ]) {
    assert.throws(
      () => parseStellarTomlFields(badValue),
      new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE),
    );
  }
});
