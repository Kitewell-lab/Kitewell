import { describe, expect, it } from "vitest";
import { offerPriceFromRow } from "./orderBook";

describe("offerPriceFromRow", () => {
  it("fills the price from a chosen bid row", () => {
    expect(offerPriceFromRow({ price: "0.5", amount: "120" })).toBe("0.5");
  });

  it("fills the price from a chosen ask row", () => {
    expect(offerPriceFromRow({ price: "0.0000001", amount: "1" })).toBe(
      "0.0000001"
    );
  });

  it("returns only the price, so nothing is submitted", () => {
    const row = { price: "2.5", amount: "9" };

    expect(offerPriceFromRow(row)).toBe("2.5");
    expect(row).toEqual({ price: "2.5", amount: "9" });
  });

  it("refuses a row without a usable price", () => {
    expect(() => offerPriceFromRow({ price: "0" })).toThrow(/no usable price/);
    expect(() => offerPriceFromRow({ price: "" })).toThrow(/no usable price/);
    expect(() => offerPriceFromRow({ price: "abc" })).toThrow(
      /no usable price/
    );
    expect(() => offerPriceFromRow({})).toThrow(/no usable price/);
  });

  it("refuses something that is not a row", () => {
    expect(() => offerPriceFromRow(null)).toThrow(/row must be an object/);
  });
});
