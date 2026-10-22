import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio alternative call signatures", () => {
  it("supports positional (n, d) arguments", () => {
    expect(formatOfferPriceRatio(3, 4)).toBe("0.7500000");
  });

  it("supports positional (n, d, options) arguments", () => {
    expect(formatOfferPriceRatio(3, 4, { decimals: 2 })).toBe("0.75");
  });

  it("supports { numerator, denominator } object format", () => {
    expect(formatOfferPriceRatio({ numerator: 5, denominator: 2 })).toBe("2.5000000");
  });
});
