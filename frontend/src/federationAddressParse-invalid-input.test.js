import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse.js";
import { FEDERATION_ADDRESS_ERROR } from "./federationAddressParseConstants.js";

describe("federationAddressParse invalid input and forbidden name chars", () => {
  it("throws TypeError on non-string inputs", () => {
    for (const invalid of [null, undefined, 42, true, {}, ["alice*example.com"]]) {
      expect(() => parseFederationAddress(invalid)).toThrow(TypeError);
      expect(() => parseFederationAddress(invalid)).toThrow(
        FEDERATION_ADDRESS_ERROR.TYPE
      );
    }
  });

  it("rejects SEP-2 forbidden characters, whitespace, and control chars in name", () => {
    for (const invalid of [
      "al<ice*example.com",
      "al>ice*example.com",
      "al,ice*example.com",
      "al ice*example.com",
      "al\tice*example.com",
      "al\u0000ice*example.com",
    ]) {
      expect(() => parseFederationAddress(invalid)).toThrow(
        FEDERATION_ADDRESS_ERROR.INVALID_NAME
      );
    }
  });
});
