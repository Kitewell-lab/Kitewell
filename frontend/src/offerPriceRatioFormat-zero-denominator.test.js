import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio, isValidPriceRatio, InvalidPriceRatioError } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio zero denominator guard", () => {
  it("rejects zero denominator in ratio object", () => {
    expect(isValidPriceRatio({ n: 10, d: 0 })).toBe(false);
    expect(() => formatOfferPriceRatio({ n: 10, d: 0 })).toThrow(InvalidPriceRatioError);
  });

  it("rejects zero denominator in positional arguments", () => {
    expect(isValidPriceRatio(5, 0)).toBe(false);
    expect(() => formatOfferPriceRatio(5, 0)).toThrow(InvalidPriceRatioError);
  });
});
