import { describe, expect, it } from "vitest";
import { formatAssetIssuerDomain, checkAssetIssuerDomain } from "./assetIssuerDomainFormat";

describe("formatAssetIssuerDomain native asset", () => {
  it("formats XLM with no issuer as XLM", () => {
    expect(formatAssetIssuerDomain("XLM")).toBe("XLM");
    expect(formatAssetIssuerDomain("native")).toBe("XLM");
  });

  it("formats object with type native as XLM", () => {
    expect(formatAssetIssuerDomain({ type: "native" })).toBe("XLM");
    expect(formatAssetIssuerDomain({ code: "XLM" })).toBe("XLM");
  });

  it("respects nativeLabel option", () => {
    expect(formatAssetIssuerDomain("XLM", null, null, { nativeLabel: "Lumens" })).toBe("Lumens");
    expect(formatAssetIssuerDomain({ type: "native" }, { nativeLabel: "Stellar Lumens" })).toBe("Stellar Lumens");
  });

  it("indicates isNative in checkAssetIssuerDomain result", () => {
    const res = checkAssetIssuerDomain("XLM");
    expect(res.ok).toBe(true);
    expect(res.isNative).toBe(true);
    expect(res.display).toBe("XLM");
  });
});
