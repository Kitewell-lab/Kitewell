import { describe, expect, it } from "vitest";
import defaultNormalize, {
  assetCodeNormalize,
  normalizeAssetCode,
} from "./assetCodeNormalize";

describe("assetCodeNormalize export aliases", () => {
  it("default and named exports point to normalizeAssetCode", () => {
    expect(defaultNormalize).toBe(normalizeAssetCode);
    expect(assetCodeNormalize).toBe(normalizeAssetCode);
  });
});
