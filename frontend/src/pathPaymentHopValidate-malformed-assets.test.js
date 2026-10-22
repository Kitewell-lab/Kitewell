import { describe, expect, it } from "vitest";
import { checkPathHops, PathPaymentHopValidationError, validatePathHops } from "./pathPaymentHopValidate";

const VALID_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("validatePathHops malformed asset descriptors", () => {
  it("rejects invalid asset code length", () => {
    // 13 characters is too long for Stellar asset code (max 12)
    const longCodeAsset = `TOOLONGASSETCODE:${VALID_ISSUER}`;
    const res = checkPathHops([longCodeAsset]);

    expect(res.ok).toBe(false);
    expect(res.code).toBe("INVALID_ASSET_CODE");
  });

  it("rejects invalid issuer public key", () => {
    const badIssuerAsset = "USDC:INVALID_ISSUER_KEY";
    const res = checkPathHops([badIssuerAsset]);

    expect(res.ok).toBe(false);
    expect(res.code).toBe("INVALID_ASSET_ISSUER");
  });

  it("rejects malformed string format missing colon or empty elements", () => {
    expect(checkPathHops(["INVALID_FORMAT"]).code).toBe("MALFORMED_ASSET_STRING");
    expect(checkPathHops([""]).code).toBe("EMPTY_HOP_ASSET");
    expect(checkPathHops([null]).code).toBe("EMPTY_HOP_ASSET");
  });

  it("rejects malformed object missing required fields", () => {
    expect(checkPathHops([{ code: "USDC" }]).code).toBe("INVALID_ASSET_ISSUER");
    expect(checkPathHops([{ issuer: VALID_ISSUER }]).code).toBe("INVALID_ASSET_CODE");
  });
});
