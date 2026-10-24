import { describe, it, expect } from "vitest";

import {
  STROOPS_PER_UNIT,
  DEFAULT_DUST_THRESHOLD_STROOPS,
  DUST_FILTER_ERROR,
} from "./balanceDustFilterConstants.js";

describe("balanceDustFilterConstants", () => {
  it("exports correct stroop scale constants", () => {
    expect(STROOPS_PER_UNIT).toBe(10_000_000n);
    expect(DEFAULT_DUST_THRESHOLD_STROOPS).toBe(1n);
  });

  it("exports frozen DUST_FILTER_ERROR dictionary", () => {
    expect(DUST_FILTER_ERROR.BALANCES_ARRAY).toBe("balances must be an array");
    expect(DUST_FILTER_ERROR.THRESHOLD_NEGATIVE).toBe("minThresholdStroops cannot be negative");
    expect(Object.isFrozen(DUST_FILTER_ERROR)).toBe(true);
  });
});
