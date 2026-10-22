import { describe, expect, it } from "vitest";
import {
  normalizeAssetCode,
  InvalidAssetCodeError,
} from "./assetCodeNormalize";

describe("assetCodeNormalize type validation", () => {
  it("throws InvalidAssetCodeError on non-string inputs", () => {
    expect(() => normalizeAssetCode(null)).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode(undefined)).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode({})).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode(["USDC"])).toThrow(InvalidAssetCodeError);

    try {
      normalizeAssetCode(null);
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidAssetCodeError);
      expect(err.reason).toBe("invalid_type");
    }
  });

  it("supports number inputs by converting them to valid codes", () => {
    expect(normalizeAssetCode(1234)).toBe("1234");
  });
});
