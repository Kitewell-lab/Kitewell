import test from "node:test";
import assert from "node:assert/strict";
import { combineMuxedAddress } from "./muxedAddressSplit.js";

const BASE_G = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const EXPECTED_M = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OU";

test("combineMuxedAddress encodes G address and number id", () => {
  const result = combineMuxedAddress(BASE_G, 12345);
  assert.equal(result, EXPECTED_M);
});

test("combineMuxedAddress encodes G address and string id", () => {
  const result = combineMuxedAddress(BASE_G, "12345");
  assert.equal(result, EXPECTED_M);
});

test("combineMuxedAddress encodes G address and BigInt id", () => {
  const result = combineMuxedAddress(BASE_G, 12345n);
  assert.equal(result, EXPECTED_M);
});
