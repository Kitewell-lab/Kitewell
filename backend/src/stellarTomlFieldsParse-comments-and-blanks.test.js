import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("handles comments, empty lines, and trailing comments", () => {
  const toml = `
# This is a comment at the start

  
# Another empty line above
AUTH_SERVER = "https://auth.example.com" # inline comment
FEDERATION_SERVER = 'https://federation.example.com'
  # Comment before end
`;

  const fields = parseStellarTomlFields(toml);
  assert.equal(fields.AUTH_SERVER, "https://auth.example.com");
  assert.equal(fields.FEDERATION_SERVER, "https://federation.example.com");
});
