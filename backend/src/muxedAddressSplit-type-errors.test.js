import test from "node:test";
import assert from "node:assert/strict";
import {
  splitMuxedAddress,
  combineMuxedAddress,
  MuxedAddressSplitError,
} from "./muxedAddressSplit.js";

const VALID_G = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";

test("splitMuxedAddress throws TypeError on non-string inputs", () => {
  assert.throws(() => splitMuxedAddress(null), TypeError);
  assert.throws(() => splitMuxedAddress(undefined), TypeError);
  assert.throws(() => splitMuxedAddress(12345), TypeError);
  assert.throws(() => splitMuxedAddress({}), TypeError);
});

test("combineMuxedAddress throws TypeError on non-string base address", () => {
  assert.throws(() => combineMuxedAddress(null, 100), TypeError);
  assert.throws(() => combineMuxedAddress(undefined, 100), TypeError);
  assert.throws(() => combineMuxedAddress(123, 100), TypeError);
});

test("combineMuxedAddress rejects nullish or empty id with MuxedAddressSplitError", () => {
  assert.throws(() => combineMuxedAddress(VALID_G, null), MuxedAddressSplitError);
  assert.throws(() => combineMuxedAddress(VALID_G, undefined), MuxedAddressSplitError);
  assert.throws(() => combineMuxedAddress(VALID_G, ""), MuxedAddressSplitError);
});
