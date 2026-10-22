import { describe, expect, it } from "vitest";
import {
  checkPathHops,
  normalizeHopAsset,
  PathPaymentHopValidationError,
} from "./pathPaymentHopValidate";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("checkPathHops and normalizeHopAsset helper validation", () => {
  it("normalizes native asset descriptors accurately", () => {
    expect(normalizeHopAsset("native")).toEqual({ type: "native", canonical: "native" });
    expect(normalizeHopAsset("XLM")).toEqual({ type: "native", canonical: "native" });
    expect(normalizeHopAsset({ type: "native" })).toEqual({ type: "native", canonical: "native" });
  });

  it("normalizes credit asset descriptors accurately", () => {
    const fromStr = normalizeHopAsset(`usdc:${ISSUER}`);
    expect(fromStr.type).toBe("credit");
    expect(fromStr.code).toBe("USDC");
    expect(fromStr.canonical).toBe(`USDC:${ISSUER}`);

    const fromObj = normalizeHopAsset({ code: "usdc", issuer: ISSUER });
    expect(fromObj.type).toBe("credit");
    expect(fromObj.code).toBe("USDC");
    expect(fromObj.canonical).toBe(`USDC:${ISSUER}`);
  });

  it("throws PathPaymentHopValidationError on invalid asset type to normalizeHopAsset", () => {
    expect(() => normalizeHopAsset(12345)).toThrow(PathPaymentHopValidationError);
  });

  it("checkPathHops returns typed error details", () => {
    const res = checkPathHops(["INVALID_HOP"]);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("MALFORMED_ASSET_STRING");
    expect(res.details).toBeDefined();
  });
});
