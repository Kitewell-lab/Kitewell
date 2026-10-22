import { describe, expect, it } from "vitest";
import {
  checkAssetIssuerDomain,
  isFormattableAsset,
} from "./assetIssuerDomainFormat";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("checkAssetIssuerDomain and isFormattableAsset helpers", () => {
  it("checkAssetIssuerDomain returns structured result on success with domain", () => {
    const res = checkAssetIssuerDomain("USDC", ISSUER, "centre.io");
    expect(res.ok).toBe(true);
    expect(res.display).toBe("USDC (centre.io)");
    expect(res.isNative).toBe(false);
    expect(res.hasDomain).toBe(true);
    expect(isFormattableAsset("USDC", ISSUER, "centre.io")).toBe(true);
  });

  it("checkAssetIssuerDomain returns structured result on success with issuer", () => {
    const res = checkAssetIssuerDomain("USDC", ISSUER);
    expect(res.ok).toBe(true);
    expect(res.display).toBe("USDC (GA5Z…KZVN)");
    expect(res.isNative).toBe(false);
    expect(res.hasDomain).toBe(false);
    expect(isFormattableAsset("USDC", ISSUER)).toBe(true);
  });

  it("isFormattableAsset returns false on invalid input without throwing", () => {
    expect(isFormattableAsset("USDC", null, null)).toBe(false);
    expect(isFormattableAsset(null)).toBe(false);
    expect(isFormattableAsset("")).toBe(false);
  });
});
