import { describe, expect, it } from "vitest";
import {
  formatAssetIssuerDomain,
  checkAssetIssuerDomain,
  AssetIssuerDomainFormatError,
} from "./assetIssuerDomainFormat";

describe("formatAssetIssuerDomain missing issuer and domain", () => {
  it("rejects credit asset missing both issuer and domain", () => {
    const res = checkAssetIssuerDomain("USDC", null, null);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("MISSING_ISSUER_AND_DOMAIN");

    expect(() => formatAssetIssuerDomain("USDC")).toThrow(AssetIssuerDomainFormatError);
  });

  it("rejects object with credit code but empty issuer and domain", () => {
    expect(() => formatAssetIssuerDomain({ code: "USDC" })).toThrow(AssetIssuerDomainFormatError);
    expect(() => formatAssetIssuerDomain({ code: "USDC", issuer: "  " })).toThrow(
      AssetIssuerDomainFormatError
    );
  });
});
