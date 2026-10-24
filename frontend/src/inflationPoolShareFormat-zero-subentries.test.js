import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat zero subentries", () => {
  it("calculates minimum reserve requirement as 2 base reserves when subentry count is 0", () => {
    // 5 XLM, base reserve 0.5 XLM, 0 subentries -> usedReserves = 2 * 0.5 = 1.0 XLM
    const result = formatReserveRatio("5.0000000", "0.5000000", 0);
    expect(result.usedReserves).toBe("1.0000000");
    expect(result.availableBalance).toBe("4.0000000");
  });
});
