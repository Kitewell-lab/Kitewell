import { describe, expect, it } from "vitest";
import {
  formatAssetIssuerDomain,
  checkAssetIssuerDomain,
  AssetIssuerDomainFormatError,
} from "./assetIssuerDomainFormat";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("formatAssetIssuerDomain invalid asset code", () => {
  it("rejects non-string code", () => {
    expect(checkAssetIssuerDomain(12345, ISSUER).code).toBe("INVALID_ASSET_CODE_TYPE");
    expect(() => formatAssetIssuerDomain(null, ISSUER)).toThrow(AssetIssuerDomainFormatError);
  });

  it("rejects empty string code", () => {
    expect(checkAssetIssuerDomain("", ISSUER).code).toBe("INVALID_ASSET_CODE");
    expect(checkAssetIssuerDomain("   ", ISSUER).code).toBe("INVALID_ASSET_CODE");
  });

  it("rejects asset code exceeding 12 characters", () => {
    expect(checkAssetIssuerDomain("TOOLONGASSETCODE", ISSUER).code).toBe("INVALID_ASSET_CODE");
  });
});
