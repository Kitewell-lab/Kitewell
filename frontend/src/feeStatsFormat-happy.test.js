import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";

const SAMPLE_DISTRIBUTION = {
  max: "5000",
  min: "100",
  mode: "100",
  p10: "100",
  p20: "100",
  p30: "110",
  p40: "120",
  p50: "150",
  p60: "200",
  p70: "300",
  p80: "500",
  p90: "1000",
  p95: "2000",
  p99: "4500",
};

describe("feeStatsFormat happy path", () => {
  it("formats a direct distribution object into 14 ordered { label, stroops } rows", () => {
    expect(formatFeeStats(SAMPLE_DISTRIBUTION)).toEqual([
      { label: "min", stroops: 100 },
      { label: "mode", stroops: 100 },
      { label: "p10", stroops: 100 },
      { label: "p20", stroops: 100 },
      { label: "p30", stroops: 110 },
      { label: "p40", stroops: 120 },
      { label: "p50", stroops: 150 },
      { label: "p60", stroops: 200 },
      { label: "p70", stroops: 300 },
      { label: "p80", stroops: 500 },
      { label: "p90", stroops: 1000 },
      { label: "p95", stroops: 2000 },
      { label: "p99", stroops: 4500 },
      { label: "max", stroops: 5000 },
    ]);
  });
});
