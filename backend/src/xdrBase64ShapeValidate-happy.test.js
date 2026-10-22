import test from "node:test";
import assert from "node:assert/strict";

import { isValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("accepts valid base64 strings with zero padding", () => {
  // 12 bytes = 16 base64 chars
  assert.equal(isValidXdrBase64("AAAAAAABBBBBBBCC"), true);
  // Real Stellar envelope base64 snippet
  assert.equal(
    isValidXdrBase64(
      "AAAAAgAAAAB63b06l2X9Gg1v2nF74L3f9jG3e0yN8Bv7qZ1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s",
    ),
    true,
  );
});

test("accepts valid base64 strings with single '=' padding", () => {
  assert.equal(isValidXdrBase64("AAAAAAA="), true);
  assert.equal(isValidXdrBase64("MDEyMzQ1Njc="), true);
});

test("accepts valid base64 strings with double '==' padding", () => {
  assert.equal(isValidXdrBase64("AAAAAA=="), true);
  assert.equal(isValidXdrBase64("SGVsbG8hIQ=="), true);
});
