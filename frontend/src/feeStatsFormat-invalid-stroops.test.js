import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";
import {
  FEE_STATS_FIELDS,
  FEE_STATS_FORMAT_ERROR,
} from "./feeStatsFormatConstants.js";

describe("feeStatsFormat invalid stroops values", () => {
  it("rejects negative, fractional, or non-numeric stroops values", () => {
    for (const badVal of [-1, 100.5, "-100", "100.0", "abc", "", true, {}]) {
      const dist = {};
      for (const key of FEE_STATS_FIELDS) {
        dist[key] = "100";
      }
      dist.p90 = badVal;

      expect(() => formatFeeStats(dist)).toThrow(
        `${FEE_STATS_FORMAT_ERROR.INVALID_STROOPS}: "p90".`
      );
    }
  });
});
