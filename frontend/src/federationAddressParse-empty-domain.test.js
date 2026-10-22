import { describe, expect, it } from "vitest";
import { parseFederationAddress, FederationAddressParseError } from "./federationAddressParse";

describe("parseFederationAddress empty domain part", () => {
  it("rejects addresses where domain part after asterisk is empty", () => {
    expect(() => parseFederationAddress("jed*")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("alice*")).toThrow(FederationAddressParseError);
  });

  it("attaches EMPTY_DOMAIN error code", () => {
    try {
      parseFederationAddress("bob*");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FederationAddressParseError);
      expect(err.code).toBe("EMPTY_DOMAIN");
    }
  });
});
