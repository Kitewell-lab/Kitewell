import { describe, expect, it } from "vitest";
import { formatFeeStats, isValidFeeStats, InvalidFeeStatsError } from "./feeStatsFormat";

describe("formatFeeStats invalid inputs handling", () => {
  it("rejects null and undefined", () => {
    expect(isValidFeeStats(null)).toBe(false);
    expect(isValidFeeStats(undefined)).toBe(false);
    expect(() => formatFeeStats(null)).toThrow(InvalidFeeStatsError);
    expect(() => formatFeeStats(undefined)).toThrow(InvalidFeeStatsError);
  });

  it("rejects non-numeric field values", () => {
    expect(isValidFeeStats({ min: "not-a-number" })).toBe(false);
    expect(() => formatFeeStats({ min: "not-a-number" })).toThrow(InvalidFeeStatsError);
  });

  it("rejects empty object without any percentile fields", () => {
    expect(isValidFeeStats({})).toBe(false);
    expect(() => formatFeeStats({})).toThrow(InvalidFeeStatsError);
  });
});
