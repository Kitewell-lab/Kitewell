import { describe, it, expect } from "vitest";
import {
  claimPredicateDescribe,
  formatRelBefore,
  ClaimPredicateDescribeError,
} from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - relBefore predicate", () => {
  it("describes standard integer relBefore seconds", () => {
    expect(claimPredicateDescribe({ relBefore: 3600 })).toBe(
      "Within 3600 seconds of creation"
    );
  });

  it("supports string numeric relBefore and snake_case rel_before", () => {
    expect(claimPredicateDescribe({ relBefore: "60" })).toBe(
      "Within 60 seconds of creation"
    );
    expect(claimPredicateDescribe({ rel_before: "120" })).toBe(
      "Within 120 seconds of creation"
    );
  });

  it("handles 0 seconds as boundary condition", () => {
    expect(claimPredicateDescribe({ relBefore: 0 })).toBe(
      "Within 0 seconds of creation"
    );
  });

  it("throws on negative or non-integer relBefore values", () => {
    expect(() => formatRelBefore(-10)).toThrow(ClaimPredicateDescribeError);
    expect(() => formatRelBefore(10.5)).toThrow(ClaimPredicateDescribeError);
    expect(() => formatRelBefore("abc")).toThrow(ClaimPredicateDescribeError);
  });
});
