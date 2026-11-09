import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";
import {
  FEE_STATS_FIELDS,
  FEE_STATS_FORMAT_ERROR,
} from "./feeStatsFormatConstants.js";

describe("feeStatsFormat missing percentile or summary fields", () => {
  it("throws when any required field is absent or nullish", () => {
    for (const missingField of ["min", "mode", "p50", "p99", "max"]) {
      const partial = {};
      for (const key of FEE_STATS_FIELDS) {
        if (key !== missingField) partial[key] = "100";
      }

      expect(() => formatFeeStats(partial)).toThrow(
        `${FEE_STATS_FORMAT_ERROR.MISSING_FIELD}: "${missingField}".`
      );
    }
  });
});
