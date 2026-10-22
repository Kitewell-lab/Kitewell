import test from "node:test";
import assert from "node:assert/strict";
import {
  splitMuxedAddress,
  isMuxedAddress,
  isBaseAddress,
} from "./muxedAddressSplit.js";

const VALID_G = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const VALID_M = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OU";

test("splitMuxedAddress allows raw G address when allowBaseAddress is true", () => {
  const result = splitMuxedAddress(VALID_G, { allowBaseAddress: true });
  assert.equal(result.baseAddress, VALID_G);
  assert.equal(result.id, null);
  assert.equal(result.isMuxed, false);
});

test("isMuxedAddress identifies valid M address and rejects G address", () => {
  assert.equal(isMuxedAddress(VALID_M), true);
  assert.equal(isMuxedAddress(VALID_G), false);
  assert.equal(isMuxedAddress("not-an-address"), false);
  assert.equal(isMuxedAddress(null), false);
});

test("isBaseAddress identifies valid G address and rejects M address", () => {
  assert.equal(isBaseAddress(VALID_G), true);
  assert.equal(isBaseAddress(VALID_M), false);
  assert.equal(isBaseAddress(""), false);
  assert.equal(isBaseAddress(undefined), false);
});
