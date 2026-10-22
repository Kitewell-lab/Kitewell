import { describe, expect, it } from "vitest";
import { validatePathHops, checkPathHops, isValidPathHops } from "./pathPaymentHopValidate";

describe("validatePathHops empty path", () => {
  it("accepts empty hops array (direct payment without intermediate hops)", () => {
    expect(isValidPathHops([])).toBe(true);

    const res = checkPathHops([]);
    expect(res.ok).toBe(true);
    expect(res.hopCount).toBe(0);
    expect(res.hops).toEqual([]);

    const validated = validatePathHops([]);
    expect(validated).toEqual([]);
  });
});
