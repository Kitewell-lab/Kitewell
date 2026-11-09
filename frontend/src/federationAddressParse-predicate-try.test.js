import { describe, expect, it } from "vitest";
import {
  isValidFederationAddress,
  tryParseFederationAddress,
} from "./federationAddressParse.js";
import {
  FEDERATION_ADDRESS_ERROR,
  FORBIDDEN_NAME_CHARS,
} from "./federationAddressParseConstants.js";

describe("federationAddressParse tryParse and predicate helpers", () => {
  it("tryParseFederationAddress returns structured ok/error objects without throwing", () => {
    expect(tryParseFederationAddress("bob*stellar.org")).toEqual({
      ok: true,
      name: "bob",
      domain: "stellar.org",
    });

    expect(tryParseFederationAddress("invalid")).toEqual({
      ok: false,
      error: FEDERATION_ADDRESS_ERROR.MISSING_SEPARATOR,
    });
  });

  it("isValidFederationAddress returns a boolean and frozen constants stay immutable", () => {
    expect(isValidFederationAddress("bob*stellar.org")).toBe(true);
    expect(isValidFederationAddress("*stellar.org")).toBe(false);
    expect(isValidFederationAddress(null)).toBe(false);
    expect(Object.isFrozen(FEDERATION_ADDRESS_ERROR)).toBe(true);
    expect(Object.isFrozen(FORBIDDEN_NAME_CHARS)).toBe(true);
  });
});
