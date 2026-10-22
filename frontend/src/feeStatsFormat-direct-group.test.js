import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat";

describe("formatFeeStats direct group object", () => {
  it("formats directly provided group object without wrapper", () => {
    const directGroup = {
      min: 100,
      p50: 150,
      max: 500,
      mode: 100
    };

    const rows = formatFeeStats(directGroup);
    expect(rows).toEqual([
      { label: "Min", stroops: 100 },
      { label: "p50", stroops: 150 },
      { label: "Max", stroops: 500 },
      { label: "Mode", stroops: 100 }
    ]);
  });
});
