import { describe, expect, it } from "vitest";
import {
  normalizeAssetCode,
  MIN_ASSET_CODE_LENGTH,
  MAX_ASSET_CODE_LENGTH,
} from "./assetCodeNormalize";

describe("assetCodeNormalize length boundaries", () => {
  it("accepts a single-character asset code", () => {
    expect(normalizeAssetCode("x")).toBe("X");
    expect(normalizeAssetCode("1")).toBe("1");
    expect(MIN_ASSET_CODE_LENGTH).toBe(1);
  });

  it("accepts exactly 12-character asset code", () => {
    const twelveChars = "abcdefghijkl";
    expect(normalizeAssetCode(twelveChars)).toBe("ABCDEFGHIJKL");
    expect(MAX_ASSET_CODE_LENGTH).toBe(12);
  });
});
