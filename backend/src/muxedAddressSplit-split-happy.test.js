import test from "node:test";
import assert from "node:assert/strict";
import { splitMuxedAddress } from "./muxedAddressSplit.js";

test("splitMuxedAddress extracts base address and numeric id from standard M address", () => {
  const muxed = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OU";
  const result = splitMuxedAddress(muxed);

  assert.equal(result.baseAddress, "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ");
  assert.equal(result.id, "12345");
  assert.equal(result.isMuxed, true);
});

test("splitMuxedAddress handles surrounding whitespace smoothly", () => {
  const muxed = "  MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OU  \n";
  const result = splitMuxedAddress(muxed);

  assert.equal(result.baseAddress, "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ");
  assert.equal(result.id, "12345");
});
