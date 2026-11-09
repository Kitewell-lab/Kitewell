import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";
import { FEE_STATS_FIELDS } from "./feeStatsFormatConstants.js";

describe("feeStatsFormat canonical row order", () => {
  it("always returns rows in canonical FEE_STATS_FIELDS order regardless of input key order", () => {
    const reversedInput = {};
    for (const key of [...FEE_STATS_FIELDS].reverse()) {
      reversedInput[key] = 100;
    }

    const rows = formatFeeStats(reversedInput);
    expect(rows.map((r) => r.label)).toEqual([...FEE_STATS_FIELDS]);
  });
});
