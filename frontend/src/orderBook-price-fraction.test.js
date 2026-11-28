import { describe, expect, it } from "vitest";
import { offerPriceFractionFromRow } from "./orderBook";

describe("offerPriceFractionFromRow", () => {
  it("fills the offer form's numerator and denominator from a chosen row", () => {
    expect(offerPriceFractionFromRow({ priceR: { n: 3, d: 2 } })).toEqual({
      numerator: "3",
      denominator: "2",
    });
  });

  it("keeps an awkward fraction exact instead of rounding the decimal", () => {
    expect(offerPriceFractionFromRow({ priceR: { n: 7, d: 3 } })).toEqual({
      numerator: "7",
      denominator: "3",
    });
  });

  it("refuses a row without a usable fraction", () => {
    expect(() => offerPriceFractionFromRow({})).toThrow(
      /no usable price fraction/
    );
    expect(() =>
      offerPriceFractionFromRow({ priceR: { n: 0, d: 1 } })
    ).toThrow(/no usable price fraction/);
    expect(() =>
      offerPriceFractionFromRow({ priceR: { n: 1, d: 0 } })
    ).toThrow(/no usable price fraction/);
    expect(() =>
      offerPriceFractionFromRow({ priceR: { n: 1.5, d: 2 } })
    ).toThrow(/no usable price fraction/);
  });

  it("refuses something that is not a row", () => {
    expect(() => offerPriceFractionFromRow(null)).toThrow(
      /row must be an object/
    );
  });
});
