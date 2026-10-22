import { describe, expect, it } from "vitest";
import { formatAssetIssuerDomain } from "./assetIssuerDomainFormat";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("formatAssetIssuerDomain with domain", () => {
  it("formats asset with domain priority", () => {
    const formatted = formatAssetIssuerDomain("USDC", ISSUER, "centre.io");
    expect(formatted).toBe("USDC (centre.io)");
  });

  it("formats lowercase asset code to uppercase", () => {
    const formatted = formatAssetIssuerDomain("yxlm", ISSUER, "ultrastellar.com");
    expect(formatted).toBe("YXLM (ultrastellar.com)");
  });

  it("trims surrounding whitespace on code and domain", () => {
    const formatted = formatAssetIssuerDomain(" btc ", ISSUER, " anclx.org ");
    expect(formatted).toBe("BTC (anclx.org)");
  });
});
