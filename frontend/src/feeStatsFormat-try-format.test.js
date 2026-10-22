import { describe, expect, it } from "vitest";
import { tryFormatFeeStats } from "./feeStatsFormat";

describe("tryFormatFeeStats safe fallback", () => {
  it("formats valid stats successfully", () => {
    const rows = tryFormatFeeStats({ min: 100, max: 200 });
    expect(rows).toHaveLength(2);
  });

  it("returns default empty array fallback on invalid input without throwing", () => {
    expect(tryFormatFeeStats(null)).toEqual([]);
    expect(tryFormatFeeStats({})).toEqual([]);
  });

  it("returns custom fallback when provided", () => {
    expect(tryFormatFeeStats(null, {}, null)).toBeNull();
  });
});
