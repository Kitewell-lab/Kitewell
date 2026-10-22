import { describe, expect, it } from "vitest";
import { formatOfferPriceRatio } from "./offerPriceRatioFormat";

describe("formatOfferPriceRatio BigInt precision accuracy", () => {
  it("formats large 64-bit integer ratios accurately without floating-point errors", () => {
    // 9223372036854775807 / 9223372036854775807 = 1.0000000
    const maxInt64 = 9223372036854775807n;
    expect(formatOfferPriceRatio({ n: maxInt64, d: maxInt64 })).toBe("1.0000000");
  });

  it("handles large numerator string inputs", () => {
    expect(formatOfferPriceRatio({ n: "1000000000000000", d: "100000000000000" })).toBe("10.0000000");
  });
});
