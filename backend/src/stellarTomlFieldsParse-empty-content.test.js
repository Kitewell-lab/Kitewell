import test from "node:test";
import assert from "node:assert/strict";

import { parseStellarTomlFields, checkStellarTomlFields } from "./stellarTomlFieldsParse.js";

test("returns empty object for empty or whitespace-only content", () => {
  assert.deepEqual(parseStellarTomlFields(""), {});
  assert.deepEqual(parseStellarTomlFields("   \n\t  "), {});

  const check = checkStellarTomlFields("");
  assert.equal(check.ok, true);
  assert.equal(check.fieldCount, 0);
  assert.deepEqual(check.fields, {});
});

test("returns empty object when content has only comments", () => {
  const toml = `
# Comment 1
# Comment 2
`;
  assert.deepEqual(parseStellarTomlFields(toml), {});
});
