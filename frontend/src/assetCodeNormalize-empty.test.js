import { describe, expect, it } from "vitest";
import {
  normalizeAssetCode,
  InvalidAssetCodeError,
} from "./assetCodeNormalize";

describe("assetCodeNormalize empty input", () => {
  it("throws InvalidAssetCodeError on empty string", () => {
    expect(() => normalizeAssetCode("")).toThrow(InvalidAssetCodeError);
    expect(() => normalizeAssetCode("   ")).toThrow(InvalidAssetCodeError);

    try {
      normalizeAssetCode("  \t  ");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidAssetCodeError);
      expect(err.reason).toBe("empty");
    }
  });
});
