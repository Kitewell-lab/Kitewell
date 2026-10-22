import { describe, expect, it } from "vitest";
import { parseFederationAddress, FederationAddressParseError } from "./federationAddressParse";

describe("parseFederationAddress non-string inputs", () => {
  it("rejects null and undefined", () => {
    expect(() => parseFederationAddress(null)).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress(undefined)).toThrow(FederationAddressParseError);
  });

  it("rejects numbers, booleans, and objects", () => {
    expect(() => parseFederationAddress(42)).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress(true)).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress({ address: "jed*stellar.org" })).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress(["jed*stellar.org"])).toThrow(FederationAddressParseError);
  });

  it("attaches INVALID_ADDRESS_TYPE code", () => {
    try {
      parseFederationAddress(null);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FederationAddressParseError);
      expect(err.code).toBe("INVALID_ADDRESS_TYPE");
    }
  });
});
