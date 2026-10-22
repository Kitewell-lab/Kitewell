import { describe, expect, it } from "vitest";
import { formatAssetIssuerDomain } from "./assetIssuerDomainFormat";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("formatAssetIssuerDomain object input support", () => {
  it("formats asset from object with domain property", () => {
    const formatted = formatAssetIssuerDomain({
      code: "USDC",
      issuer: ISSUER,
      domain: "centre.io",
    });
    expect(formatted).toBe("USDC (centre.io)");
  });

  it("formats asset from object with homeDomain property", () => {
    const formatted = formatAssetIssuerDomain({
      code: "USDC",
      issuer: ISSUER,
      homeDomain: "circle.com",
    });
    expect(formatted).toBe("USDC (circle.com)");
  });

  it("formats asset from object with home_domain property", () => {
    const formatted = formatAssetIssuerDomain({
      code: "USDC",
      issuer: ISSUER,
      home_domain: "centre.io",
    });
    expect(formatted).toBe("USDC (centre.io)");
  });

  it("formats asset from object with no domain fallback to issuer", () => {
    const formatted = formatAssetIssuerDomain({
      code: "USDC",
      issuer: ISSUER,
    });
    expect(formatted).toBe("USDC (GA5Z…KZVN)");
  });
});
