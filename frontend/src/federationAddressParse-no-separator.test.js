import { describe, expect, it } from "vitest";
import { parseFederationAddress, FederationAddressParseError } from "./federationAddressParse";

describe("parseFederationAddress missing separator", () => {
  it("rejects addresses without an asterisk", () => {
    expect(() => parseFederationAddress("jed.stellar.org")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("jed@stellar.org")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("simpleaccount")).toThrow(FederationAddressParseError);
  });

  it("attaches MISSING_SEPARATOR error code", () => {
    try {
      parseFederationAddress("plainstring");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FederationAddressParseError);
      expect(err.code).toBe("MISSING_SEPARATOR");
    }
  });
});
