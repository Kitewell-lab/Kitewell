import { describe, expect, it } from "vitest";
import { tryFormatOfferPriceRatio } from "./offerPriceRatioFormat";

describe("tryFormatOfferPriceRatio safe conversion", () => {
  it("formats valid ratio successfully", () => {
    expect(tryFormatOfferPriceRatio({ n: 1, d: 2 })).toBe("0.5000000");
  });

  it("returns default fallback ('N/A') on zero denominator without throwing", () => {
    expect(tryFormatOfferPriceRatio({ n: 1, d: 0 })).toBe("N/A");
  });

  it("returns custom fallback when specified", () => {
    expect(tryFormatOfferPriceRatio(null, {}, "--")).toBe("--");
  });
});
