import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio, isValidPriceRatio } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio happy path", () => {
  it("formats 1/2 as 0.5000000 by default (7 decimals)", () => {
    expect(isValidPriceRatio({ n: 1, d: 2 })).toBe(true);
    expect(formatOfferPriceRatio({ n: 1, d: 2 })).toBe("0.5000000");
  });

  it("formats 1/1 as 1.0000000", () => {
    expect(formatOfferPriceRatio({ n: 1, d: 1 })).toBe("1.0000000");
  });

  it("formats repeating decimals with half-up rounding (1/3 -> 0.3333333, 2/3 -> 0.6666667)", () => {
    expect(formatOfferPriceRatio({ n: 1, d: 3 })).toBe("0.3333333");
    expect(formatOfferPriceRatio({ n: 2, d: 3 })).toBe("0.6666667");
  });
});
