import { describe, expect, it } from "vitest";
import { formatAssetIssuerDomain } from "./assetIssuerDomainFormat";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("formatAssetIssuerDomain shortened issuer fallback", () => {
  it("formats asset with shortened issuer when domain is null", () => {
    const formatted = formatAssetIssuerDomain("USDC", ISSUER, null);
    expect(formatted).toBe("USDC (GA5Z…KZVN)");
  });

  it("formats asset with shortened issuer when domain is undefined", () => {
    const formatted = formatAssetIssuerDomain("EURT", ISSUER);
    expect(formatted).toBe("EURT (GA5Z…KZVN)");
  });

  it("formats asset with shortened issuer when domain is empty string", () => {
    const formatted = formatAssetIssuerDomain("AQUA", ISSUER, "   ");
    expect(formatted).toBe("AQUA (GA5Z…KZVN)");
  });
});
