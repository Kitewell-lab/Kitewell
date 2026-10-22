import { describe, expect, it } from "vitest";
import {
  normalizeAssetCode,
  InvalidAssetCodeError,
} from "./assetCodeNormalize";

describe("assetCodeNormalize length validation", () => {
  it("throws InvalidAssetCodeError when trimmed code exceeds 12 characters", () => {
    expect(() => normalizeAssetCode("abcdefghijklm")).toThrow(
      InvalidAssetCodeError,
    );
    try {
      normalizeAssetCode("toolongassetcode");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidAssetCodeError);
      expect(err.reason).toBe("too_long");
    }
  });
});
