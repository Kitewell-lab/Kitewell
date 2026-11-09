import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse.js";
import { FEDERATION_ADDRESS_ERROR } from "./federationAddressParseConstants.js";

describe("federationAddressParse empty name or domain", () => {
  it("rejects an empty or whitespace-only string", () => {
    expect(() => parseFederationAddress("")).toThrow(
      FEDERATION_ADDRESS_ERROR.EMPTY
    );
    expect(() => parseFederationAddress("   ")).toThrow(
      FEDERATION_ADDRESS_ERROR.EMPTY
    );
  });

  it("rejects an empty name before *", () => {
    expect(() => parseFederationAddress("*example.com")).toThrow(
      FEDERATION_ADDRESS_ERROR.EMPTY_NAME
    );
  });

  it("rejects an empty domain after *", () => {
    expect(() => parseFederationAddress("alice*")).toThrow(
      FEDERATION_ADDRESS_ERROR.EMPTY_DOMAIN
    );
  });

  it("rejects a bare * separator", () => {
    expect(() => parseFederationAddress("*")).toThrow(
      FEDERATION_ADDRESS_ERROR.EMPTY_NAME
    );
  });
});
