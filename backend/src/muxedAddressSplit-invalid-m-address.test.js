import test from "node:test";
import assert from "node:assert/strict";
import { splitMuxedAddress, MuxedAddressSplitError } from "./muxedAddressSplit.js";

test("splitMuxedAddress rejects empty address", () => {
  assert.throws(() => splitMuxedAddress(""), MuxedAddressSplitError);
  assert.throws(() => splitMuxedAddress("   "), MuxedAddressSplitError);
});

test("splitMuxedAddress rejects malformed M address with invalid checksum", () => {
  // Corrupted last character of valid M address
  const corrupted = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OZ";
  assert.throws(() => splitMuxedAddress(corrupted), MuxedAddressSplitError);
});

test("splitMuxedAddress rejects raw G address when allowBaseAddress is false", () => {
  const rawG = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
  assert.throws(
    () => splitMuxedAddress(rawG),
    (err) => err instanceof MuxedAddressSplitError && err.message.includes("allowBaseAddress")
  );
});

test("splitMuxedAddress rejects random non-stellar string", () => {
  assert.throws(() => splitMuxedAddress("not-an-address"), MuxedAddressSplitError);
});
