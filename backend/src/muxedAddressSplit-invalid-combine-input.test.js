import test from "node:test";
import assert from "node:assert/strict";
import { combineMuxedAddress, MuxedAddressSplitError } from "./muxedAddressSplit.js";

const VALID_G = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";

test("combineMuxedAddress rejects invalid base address", () => {
  assert.throws(
    () => combineMuxedAddress("INVALID_ADDRESS", 100),
    MuxedAddressSplitError
  );
});

test("combineMuxedAddress rejects negative id", () => {
  assert.throws(
    () => combineMuxedAddress(VALID_G, -1),
    MuxedAddressSplitError
  );
  assert.throws(
    () => combineMuxedAddress(VALID_G, -5n),
    MuxedAddressSplitError
  );
});

test("combineMuxedAddress rejects floating point id", () => {
  assert.throws(
    () => combineMuxedAddress(VALID_G, 12.34),
    MuxedAddressSplitError
  );
});

test("combineMuxedAddress rejects non-numeric string id", () => {
  assert.throws(
    () => combineMuxedAddress(VALID_G, "abc"),
    MuxedAddressSplitError
  );
  assert.throws(
    () => combineMuxedAddress(VALID_G, "123a"),
    MuxedAddressSplitError
  );
});
