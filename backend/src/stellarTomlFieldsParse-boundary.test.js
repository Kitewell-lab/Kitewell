import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";
import {
  MAX_STELLAR_TOML_BYTES,
  STELLAR_TOML_PARSE_ERROR,
} from "./stellarTomlFieldsParseConstants.js";

test("accepts stellar.toml content at the exact 102,400-byte SEP-1 boundary", () => {
  const line = 'HORIZON_URL = "https://horizon-testnet.stellar.org"\n';
  const paddingLength = MAX_STELLAR_TOML_BYTES - Buffer.byteLength(line, "utf8") - 2;
  const exactMax = `${line}# ${"a".repeat(paddingLength)}`;

  assert.equal(Buffer.byteLength(exactMax, "utf8"), MAX_STELLAR_TOML_BYTES);
  assert.deepEqual(parseStellarTomlFields(exactMax), {
    HORIZON_URL: "https://horizon-testnet.stellar.org",
  });
});

test("rejects stellar.toml content 1 byte above the 102,400-byte SEP-1 limit", () => {
  const overMax = "a".repeat(MAX_STELLAR_TOML_BYTES + 1);
  assert.throws(() => parseStellarTomlFields(overMax), {
    name: "RangeError",
    message: STELLAR_TOML_PARSE_ERROR.TOO_LARGE,
  });
});
