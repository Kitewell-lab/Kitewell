import { describe, expect, it } from "vitest";
import { parseFederationAddress, FederationAddressParseError } from "./federationAddressParse";

describe("parseFederationAddress multiple separators", () => {
  it("rejects addresses containing more than one asterisk", () => {
    expect(() => parseFederationAddress("alice*sub*stellar.org")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("a*b*c*d")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("**domain.com")).toThrow(FederationAddressParseError);
  });

  it("attaches MULTIPLE_SEPARATORS error code", () => {
    try {
      parseFederationAddress("first*second*third");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FederationAddressParseError);
      expect(err.code).toBe("MULTIPLE_SEPARATORS");
    }
  });
});
