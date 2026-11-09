import { describe, expect, it } from "vitest";
import { formatFeeStats } from "./feeStatsFormat.js";
import { FEE_STATS_FORMAT_ERROR } from "./feeStatsFormatConstants.js";

describe("feeStatsFormat invalid top-level input or options", () => {
  it("throws TypeError when feeStats is not a plain object", () => {
    for (const invalid of [null, undefined, "100", 100, true, []]) {
      expect(() => formatFeeStats(invalid)).toThrow(TypeError);
      expect(() => formatFeeStats(invalid)).toThrow(
        FEE_STATS_FORMAT_ERROR.TYPE
      );
    }
  });

  it("throws TypeError when options is not a plain object", () => {
    for (const badOpts of [null, "fee_charged", 123, []]) {
      expect(() => formatFeeStats({}, badOpts)).toThrow(TypeError);
      expect(() => formatFeeStats({}, badOpts)).toThrow(
        FEE_STATS_FORMAT_ERROR.OPTIONS_TYPE
      );
    }
  });
});
