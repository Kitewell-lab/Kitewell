import { describe, expect, it } from "vitest";
import { formatFeeStats, isValidFeeStats } from "./feeStatsFormat";

describe("formatFeeStats standard Horizon response", () => {
  const MOCK_HORIZON_RESPONSE = {
    last_ledger: "55000000",
    last_ledger_base_fee: "100",
    ledger_capacity_usage: "0.22",
    fee_charged: {
      min: "100",
      p10: "100",
      p20: "100",
      p30: "100",
      p40: "100",
      p50: "100",
      p60: "100",
      p70: "100",
      p80: "100",
      p90: "100",
      p95: "150",
      p99: "200",
      max: "1000",
      mode: "100"
    }
  };

  it("recognizes standard Horizon response as valid", () => {
    expect(isValidFeeStats(MOCK_HORIZON_RESPONSE)).toBe(true);
  });

  it("extracts and formats all 14 percentile/extreme rows in canonical order", () => {
    const rows = formatFeeStats(MOCK_HORIZON_RESPONSE);
    expect(rows).toHaveLength(14);

    expect(rows[0]).toEqual({ label: "Min", stroops: 100 });
    expect(rows[1]).toEqual({ label: "p10", stroops: 100 });
    expect(rows[10]).toEqual({ label: "p95", stroops: 150 });
    expect(rows[11]).toEqual({ label: "p99", stroops: 200 });
    expect(rows[12]).toEqual({ label: "Max", stroops: 1000 });
    expect(rows[13]).toEqual({ label: "Mode", stroops: 100 });
  });
});
