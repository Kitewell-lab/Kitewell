import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse.js";
import {
  FEDERATION_ADDRESS_ERROR,
  MAX_FEDERATION_DOMAIN_LENGTH,
  MAX_FEDERATION_NAME_LENGTH,
} from "./federationAddressParseConstants.js";

describe("federationAddressParse length boundaries", () => {
  it("accepts a single-character name and a 256-character name", () => {
    expect(parseFederationAddress("a*a.co")).toEqual({
      name: "a",
      domain: "a.co",
    });

    const maxName = "x".repeat(MAX_FEDERATION_NAME_LENGTH);
    expect(parseFederationAddress(`${maxName}*example.com`)).toEqual({
      name: maxName,
      domain: "example.com",
    });
  });

  it("rejects a 257-character name", () => {
    const overMaxName = "x".repeat(MAX_FEDERATION_NAME_LENGTH + 1);
    expect(() => parseFederationAddress(`${overMaxName}*example.com`)).toThrow(
      FEDERATION_ADDRESS_ERROR.NAME_TOO_LONG
    );
  });

  it("rejects a domain exceeding 253 characters", () => {
    const longDomain = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`;
    expect(longDomain.length).toBeGreaterThan(MAX_FEDERATION_DOMAIN_LENGTH);
    expect(() => parseFederationAddress(`alice*${longDomain}`)).toThrow(
      FEDERATION_ADDRESS_ERROR.DOMAIN_TOO_LONG
    );
  });
});
