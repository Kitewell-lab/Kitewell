import { describe, expect, it } from "vitest";
import {
  normalizeAssetCode,
  InvalidAssetCodeError,
} from "./assetCodeNormalize";

describe("assetCodeNormalize charset validation", () => {
  it("rejects non-alphanumeric characters", () => {
    expect(() => normalizeAssetCode("USD-T")).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode("USD_C")).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode("BTC.B")).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode("US DC")).toThrow(InvalidAssetCodeError);

    try {
      normalizeAssetCode("XLM$");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidAssetCodeError);
      expect(err.reason).toBe("invalid_charset");
    }
  });
});
