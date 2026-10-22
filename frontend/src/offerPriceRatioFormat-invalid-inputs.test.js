import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio, InvalidPriceRatioError } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio invalid inputs handling", () => {
  it("rejects negative numerator or denominator", () => {
    expect(() => formatOfferPriceRatio({ n: -1, d: 2 })).toThrow(InvalidPriceRatioError);
    expect(() => formatOfferPriceRatio({ n: 1, d: -2 })).toThrow(InvalidPriceRatioError);
  });

  it("rejects non-numeric string values", () => {
    expect(() => formatOfferPriceRatio({ n: "abc", d: 2 })).toThrow(InvalidPriceRatioError);
    expect(() => formatOfferPriceRatio({ n: 1, d: "xyz" })).toThrow(InvalidPriceRatioError);
  });

  it("rejects negative or out-of-range decimals options", () => {
    expect(() => formatOfferPriceRatio({ n: 1, d: 2 }, { decimals: -1 })).toThrow(RangeError);
    expect(() => formatOfferPriceRatio({ n: 1, d: 2 }, { decimals: 25 })).toThrow(RangeError);
    expect(() => formatOfferPriceRatio({ n: 1, d: 2 }, { decimals: "invalid" })).toThrow(TypeError);
  });
});
