import { describe, expect, it } from "vitest";
import { formatFeeStats, isValidFeeStats, InvalidFeeStatsError } from "./feeStatsFormat";

describe("formatFeeStats negative value validation", () => {
  it("rejects negative fee values", () => {
    expect(isValidFeeStats({ min: -100, max: 200 })).toBe(false);
    expect(() => formatFeeStats({ min: -100, max: 200 })).toThrow(InvalidFeeStatsError);
  });
});
