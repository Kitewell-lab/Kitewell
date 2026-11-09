import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";
import { FEE_STATS_FIELDS } from "./feeStatsFormatConstants.js";

describe("feeStatsFormat numeric boundary values", () => {
  it("accepts 0 and Number.MAX_SAFE_INTEGER stroop values", () => {
    const input = {};
    for (const key of FEE_STATS_FIELDS) {
      input[key] = key === "max" ? String(Number.MAX_SAFE_INTEGER) : "0";
    }

    const rows = formatFeeStats(input);
    expect(rows[0]).toEqual({ label: "min", stroops: 0 });
    expect(rows[rows.length - 1]).toEqual({
      label: "max",
      stroops: Number.MAX_SAFE_INTEGER,
    });
  });

  it("rejects integer strings exceeding Number.MAX_SAFE_INTEGER", () => {
    const input = {};
    for (const key of FEE_STATS_FIELDS) {
      input[key] = "100";
    }
    input.max = "9007199254740992"; // MAX_SAFE_INTEGER + 1

    expect(() => formatFeeStats(input)).toThrow(/max/);
  });
});
