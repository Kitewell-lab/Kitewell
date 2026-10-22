import { describe, it, expect } from "vitest";
import {
  claimPredicateDescribe,
  formatAbsBefore,
  ClaimPredicateDescribeError,
} from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - absBefore predicate", () => {
  it("describes valid ISO date strings", () => {
    const iso = "2026-12-31T23:59:59.000Z";
    expect(claimPredicateDescribe({ absBefore: iso })).toBe(`Before ${iso}`);
  });

  it("describes snake_case abs_before and absBeforeEpoch", () => {
    expect(claimPredicateDescribe({ abs_before: "2027-01-01T00:00:00.000Z" })).toBe(
      "Before 2027-01-01T00:00:00.000Z"
    );
    expect(claimPredicateDescribe({ absBeforeEpoch: 1700000000 })).toBe(
      `Before ${new Date(1700000000 * 1000).toISOString()}`
    );
  });

  it("supports Date instances", () => {
    const d = new Date("2028-06-15T12:00:00.000Z");
    expect(formatAbsBefore(d)).toBe("Before 2028-06-15T12:00:00.000Z");
  });

  it("throws on invalid date string or negative timestamp", () => {
    expect(() => formatAbsBefore("not-a-valid-date")).toThrow(
      ClaimPredicateDescribeError
    );
    expect(() => formatAbsBefore(-500)).toThrow(ClaimPredicateDescribeError);
  });
});
