import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("skips blank lines, full-line comments, and trailing comments while preserving # inside quotes", () => {
  const raw = `
# Stellar TOML configuration
   # Indented comment

NETWORK_PASSPHRASE = "Test #1 ; Network" # inline comment
FEDERATION_SERVER = "https://example.com/fed#anchor"   # another comment
`;

  assert.deepEqual(parseStellarTomlFields(raw), {
    NETWORK_PASSPHRASE: "Test #1 ; Network",
    FEDERATION_SERVER: "https://example.com/fed#anchor",
  });
});

test("returns an empty object for empty or comment-only content", () => {
  assert.deepEqual(parseStellarTomlFields(""), {});
  assert.deepEqual(parseStellarTomlFields("   \n# comment only\n  "), {});
});
