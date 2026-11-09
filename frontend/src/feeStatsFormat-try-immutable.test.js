import { describe, expect, it } from "vitest";
import { tryFormatFeeStats } from "./feeStatsFormat.js";
import {
  FEE_STATS_BUCKETS,
  FEE_STATS_FIELDS,
  FEE_STATS_FORMAT_ERROR,
} from "./feeStatsFormatConstants.js";

describe("feeStatsFormat tryFormatFeeStats and frozen constants", () => {
  it("tryFormatFeeStats returns ok/rows on valid input and ok:false on invalid input", () => {
    const valid = {};
    for (const key of FEE_STATS_FIELDS) valid[key] = "100";

    const okResult = tryFormatFeeStats(valid);
    expect(okResult.ok).toBe(true);
    expect(okResult.rows).toHaveLength(14);

    expect(tryFormatFeeStats(null)).toEqual({
      ok: false,
      error: FEE_STATS_FORMAT_ERROR.TYPE,
    });
  });

  it("freezes exported constant lists and error maps", () => {
    expect(Object.isFrozen(FEE_STATS_FIELDS)).toBe(true);
    expect(Object.isFrozen(FEE_STATS_BUCKETS)).toBe(true);
    expect(Object.isFrozen(FEE_STATS_FORMAT_ERROR)).toBe(true);
  });
});
