import { describe, expect, it } from "vitest";
import {
  tryNormalizeAssetCode,
  InvalidAssetCodeError,
} from "./assetCodeNormalize";

describe("tryNormalizeAssetCode safe wrapper", () => {
  it("returns ok: true with normalized code on valid input", () => {
    const res = tryNormalizeAssetCode("  usdc  ");
    expect(res).toEqual({ ok: true, code: "USDC" });
  });

  it("returns ok: false with typed error on invalid input without throwing", () => {
    const res = tryNormalizeAssetCode("bad-code");
    expect(res.ok).toBe(false);
    expect(res.error).toBeInstanceOf(InvalidAssetCodeError);
    expect(res.error.reason).toBe("invalid_charset");
  });
});
