import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse.js";
import { FEDERATION_ADDRESS_ERROR } from "./federationAddressParseConstants.js";

describe("federationAddressParse domain validation", () => {
  it("rejects domains without a TLD or with invalid labels", () => {
    for (const invalid of [
      "alice*localhost",
      "alice*.example.com",
      "alice*example.com.",
      "alice*-bad.com",
      "alice*bad-.com",
      "alice*example.123",
      "alice*exa mple.com",
    ]) {
      expect(() => parseFederationAddress(invalid)).toThrow(
        FEDERATION_ADDRESS_ERROR.INVALID_DOMAIN
      );
    }
  });
});
