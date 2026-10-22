import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat";

describe("formatFeeStats group option", () => {
  const RESPONSE_WITH_GROUPS = {
    fee_charged: { min: "100", max: "200" },
    max_fee: { min: "500", max: "10000", mode: "1000" }
  };

  it("extracts max_fee group when specified in options", () => {
    const rows = formatFeeStats(RESPONSE_WITH_GROUPS, { group: "max_fee" });
    expect(rows).toEqual([
      { label: "Min", stroops: 500 },
      { label: "Max", stroops: 10000 },
      { label: "Mode", stroops: 1000 }
    ]);
  });
});
