import { describe, expect, it } from "vitest";
import { normalizeAssetCode } from "./assetCodeNormalize";

describe("assetCodeNormalize happy path", () => {
  it("converts lowercase codes to uppercase", () => {
    expect(normalizeAssetCode("usdc")).toBe("USDC");
    expect(normalizeAssetCode("btc")).toBe("BTC");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeAssetCode("  usdt  ")).toBe("USDT");
    expect(normalizeAssetCode("\tETH\n")).toBe("ETH");
  });

  it("preserves alphanumeric digits in code", () => {
    expect(normalizeAssetCode("usd1")).toBe("USD1");
    expect(normalizeAssetCode("token2026")).toBe("TOKEN2026");
  });
});
