import test from "node:test";
import assert from "node:assert/strict";

import {
  parseStellarTomlFields,
  checkStellarTomlFields,
  StellarTomlParseError,
} from "./stellarTomlFieldsParse.js";

test("rejects non-string input on checkStellarTomlFields", () => {
  assert.equal(checkStellarTomlFields(null).code, "INVALID_CONTENT_TYPE");
  assert.equal(checkStellarTomlFields(undefined).code, "INVALID_CONTENT_TYPE");
  assert.equal(checkStellarTomlFields(12345).code, "INVALID_CONTENT_TYPE");
  assert.equal(checkStellarTomlFields({ content: "TOML" }).code, "INVALID_CONTENT_TYPE");
});

test("throws StellarTomlParseError on parseStellarTomlFields with non-string input", () => {
  assert.throws(
    () => parseStellarTomlFields(null),
    (err) => {
      assert.ok(err instanceof StellarTomlParseError);
      assert.equal(err.code, "INVALID_CONTENT_TYPE");
      return true;
    }
  );
});
