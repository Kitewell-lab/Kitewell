import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio custom decimals", () => {
  it("formats with 2 decimal places", () => {
    expect(formatOfferPriceRatio({ n: 1, d: 2 }, { decimals: 2 })).toBe("0.50");
    expect(formatOfferPriceRatio({ n: 10, d: 4 }, { decimals: 2 })).toBe("2.50");
  });

  it("formats with 4 decimal places", () => {
    expect(formatOfferPriceRatio({ n: 1, d: 8 }, { decimals: 4 })).toBe("0.1250");
  });

  it("formats with 0 decimal places (integer result)", () => {
    expect(formatOfferPriceRatio({ n: 5, d: 2 }, { decimals: 0 })).toBe("3"); // 2.5 rounded up to 3
    expect(formatOfferPriceRatio({ n: 4, d: 2 }, { decimals: 0 })).toBe("2");
  });
});
