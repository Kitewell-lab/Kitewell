import { describe, it, expect } from "vitest";

import {
  STROOPS_PER_XLM,
  DEFAULT_BASE_RESERVE_STROOPS,
  ACCOUNT_BASE_RESERVE_MULTIPLIER,
  RESERVE_FORMAT_ERROR,
} from "./inflationPoolShareFormatConstants.js";

describe("inflationPoolShareFormatConstants", () => {
  it("exports correct stroop scale constants", () => {
    expect(STROOPS_PER_XLM).toBe(10_000_000n);
    expect(DEFAULT_BASE_RESERVE_STROOPS).toBe(5_000_000n);
    expect(ACCOUNT_BASE_RESERVE_MULTIPLIER).toBe(2n);
  });

  it("exports frozen RESERVE_FORMAT_ERROR dictionary", () => {
    expect(RESERVE_FORMAT_ERROR.BALANCE_REQUIRED).toBe("nativeBalance is required");
    expect(RESERVE_FORMAT_ERROR.NEGATIVE).toBe("cannot be negative");
    expect(Object.isFrozen(RESERVE_FORMAT_ERROR)).toBe(true);
  });
});
