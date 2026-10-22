import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat custom base reserve", () => {
  it("computes reserves accurately when network uses a custom base reserve", () => {
    // 100 XLM, custom base reserve 1.0 XLM, 5 subentries
    // used = (2 + 5) * 1.0 = 7.0 XLM, available = 93.0 XLM
    const res = formatReserveRatio("100.0000000", "1.0000000", 5);
    expect(res.usedReserves).toBe("7.0000000");
    expect(res.availableBalance).toBe("93.0000000");
  });
});
