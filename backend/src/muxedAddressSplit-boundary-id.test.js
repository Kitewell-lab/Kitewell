import test from "node:test";
import assert from "node:assert/strict";
import {
  splitMuxedAddress,
  combineMuxedAddress,
  MAX_UINT64,
  MuxedAddressSplitError,
} from "./muxedAddressSplit.js";

const BASE_G = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";

test("handles boundary ID 0", () => {
  const muxed = combineMuxedAddress(BASE_G, 0);
  const result = splitMuxedAddress(muxed);
  assert.equal(result.baseAddress, BASE_G);
  assert.equal(result.id, "0");
});

test("handles boundary ID MAX_UINT64", () => {
  const muxed = combineMuxedAddress(BASE_G, MAX_UINT64);
  const result = splitMuxedAddress(muxed);
  assert.equal(result.baseAddress, BASE_G);
  assert.equal(result.id, MAX_UINT64.toString());
});

test("rejects ID exceeding MAX_UINT64", () => {
  assert.throws(
    () => combineMuxedAddress(BASE_G, MAX_UINT64 + 1n),
    MuxedAddressSplitError
  );
  assert.throws(
    () => combineMuxedAddress(BASE_G, "18446744073709551616"),
    MuxedAddressSplitError
  );
});
