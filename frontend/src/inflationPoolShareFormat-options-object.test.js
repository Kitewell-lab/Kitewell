import { describe, expect, it } from "vitest";
import { formatReserveRatio, inflationPoolShareFormat } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat options object invocation", () => {
  it("accepts an options object with nativeBalance, baseReserve, and subentryCount", () => {
    const res = formatReserveRatio({
      nativeBalance: "20.0000000",
      baseReserve: "0.5000000",
      subentryCount: 4,
    });
    // used = (2 + 4) * 0.5 = 3.0 XLM, available = 17.0 XLM
    expect(res.usedReserves).toBe("3.0000000");
    expect(res.availableBalance).toBe("17.0000000");
  });

  it("works with inflationPoolShareFormat alias and default base reserve", () => {
    // default base reserve = 0.5 XLM = 5,000,000 stroops
    const res = inflationPoolShareFormat({
      balance: "5.0000000",
      subentry_count: 1,
    });
    // used = (2 + 1) * 0.5 = 1.5 XLM, available = 3.5 XLM
    expect(res.usedReserves).toBe("1.5000000");
    expect(res.availableBalance).toBe("3.5000000");
  });
});
