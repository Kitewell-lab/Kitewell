import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse.js";
import { FEDERATION_ADDRESS_ERROR } from "./federationAddressParseConstants.js";

describe("federationAddressParse separator validation", () => {
  it("rejects addresses without a * separator", () => {
    expect(() => parseFederationAddress("alice@example.com")).toThrow(
      FEDERATION_ADDRESS_ERROR.MISSING_SEPARATOR
    );
    expect(() => parseFederationAddress("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toThrow(
      FEDERATION_ADDRESS_ERROR.MISSING_SEPARATOR
    );
  });

  it("rejects addresses with more than one * separator", () => {
    expect(() => parseFederationAddress("alice*bob*example.com")).toThrow(
      FEDERATION_ADDRESS_ERROR.MULTIPLE_SEPARATORS
    );
    expect(() => parseFederationAddress("alice**example.com")).toThrow(
      FEDERATION_ADDRESS_ERROR.MULTIPLE_SEPARATORS
    );
  });
});
