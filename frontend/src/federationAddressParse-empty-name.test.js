import { describe, expect, it } from "vitest";
import { parseFederationAddress, FederationAddressParseError } from "./federationAddressParse";

describe("parseFederationAddress empty name part", () => {
  it("rejects addresses where name part before asterisk is empty", () => {
    expect(() => parseFederationAddress("*stellar.org")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("*example.com")).toThrow(FederationAddressParseError);
  });

  it("attaches EMPTY_NAME error code", () => {
    try {
      parseFederationAddress("*domain.org");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FederationAddressParseError);
      expect(err.code).toBe("EMPTY_NAME");
    }
  });
});
