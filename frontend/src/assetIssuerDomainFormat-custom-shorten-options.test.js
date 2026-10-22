import { describe, expect, it } from "vitest";
import { formatAssetIssuerDomain } from "./assetIssuerDomainFormat";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("formatAssetIssuerDomain custom shorten options", () => {
  it("supports custom prefixLength and suffixLength", () => {
    const formatted = formatAssetIssuerDomain("USDC", ISSUER, null, {
      prefixLength: 6,
      suffixLength: 6,
    });
    expect(formatted).toBe("USDC (GA5ZSE…K4KZVN)");
  });

  it("supports custom ellipsis string", () => {
    const formatted = formatAssetIssuerDomain("USDC", ISSUER, null, {
      ellipsis: "...",
      prefixLength: 4,
      suffixLength: 4,
    });
    expect(formatted).toBe("USDC (GA5Z...KZVN)");
  });
});
