import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat";

describe("formatFeeStats partial fields handling", () => {
  it("gracefully omits fields that are not present in raw data", () => {
    const sparse = {
      min: "100",
      p50: "150",
      max: "500"
    };

    const rows = formatFeeStats(sparse);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.label)).toEqual(["Min", "p50", "Max"]);
    expect(rows.map((r) => r.stroops)).toEqual([100, 150, 500]);
  });
});
