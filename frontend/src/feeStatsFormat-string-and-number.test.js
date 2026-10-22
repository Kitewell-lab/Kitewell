import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat";

describe("formatFeeStats number/string conversions", () => {
  it("normalizes string digits into numbers by default", () => {
    const raw = { min: "100", max: 500 };
    const rows = formatFeeStats(raw);
    expect(rows[0].stroops).toBe(100);
    expect(rows[1].stroops).toBe(500);
  });

  it("returns stroops as strings when asString option is true", () => {
    const raw = { min: "100", max: 500 };
    const rows = formatFeeStats(raw, { asString: true });
    expect(rows[0].stroops).toBe("100");
    expect(rows[1].stroops).toBe("500");
  });
});
