import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio trimTrailingZeros option", () => {
  it("trims trailing zeros from decimal fraction", () => {
    expect(formatOfferPriceRatio({ n: 1, d: 2 }, { trimTrailingZeros: true })).toBe("0.5");
    expect(formatOfferPriceRatio({ n: 1, d: 4 }, { trimTrailingZeros: true })).toBe("0.25");
  });

  it("trims decimal point entirely when value is a whole integer", () => {
    expect(formatOfferPriceRatio({ n: 10, d: 2 }, { trimTrailingZeros: true })).toBe("5");
    expect(formatOfferPriceRatio({ n: 0, d: 1 }, { trimTrailingZeros: true })).toBe("0");
  });
});
