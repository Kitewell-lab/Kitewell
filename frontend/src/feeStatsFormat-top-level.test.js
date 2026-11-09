import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";
import { FEE_STATS_FORMAT_ERROR } from "./feeStatsFormatConstants.js";

function makeDist(base) {
  return {
    min: String(base),
    mode: String(base),
    p10: String(base),
    p20: String(base),
    p30: String(base),
    p40: String(base),
    p50: String(base),
    p60: String(base),
    p70: String(base),
    p80: String(base),
    p90: String(base),
    p95: String(base),
    p99: String(base),
    max: String(base),
  };
}

describe("feeStatsFormat top-level Horizon /fee_stats response", () => {
  it("reads fee_charged by default and max_fee when requested via options.bucket", () => {
    const horizonResponse = {
      last_ledger: "12345",
      last_ledger_base_fee: "100",
      ledger_capacity_usage: "0.42",
      fee_charged: makeDist(100),
      max_fee: makeDist(500),
    };

    const chargedRows = formatFeeStats(horizonResponse);
    expect(chargedRows[0]).toEqual({ label: "min", stroops: 100 });

    const maxFeeRows = formatFeeStats(horizonResponse, { bucket: "max_fee" });
    expect(maxFeeRows[0]).toEqual({ label: "min", stroops: 500 });
  });

  it("throws when the requested bucket is missing or unsupported", () => {
    expect(() =>
      formatFeeStats({ fee_charged: makeDist(100) }, { bucket: "max_fee" })
    ).toThrow(FEE_STATS_FORMAT_ERROR.MISSING_BUCKET);

    expect(() =>
      formatFeeStats({ fee_charged: makeDist(100) }, { bucket: "invalid" })
    ).toThrow(FEE_STATS_FORMAT_ERROR.INVALID_BUCKET);
  });
});
