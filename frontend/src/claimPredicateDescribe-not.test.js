import { describe, it, expect } from "vitest";
import {
  claimPredicateDescribe,
  ClaimPredicateDescribeError,
} from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - not predicate", () => {
  it("describes not with unconditional child", () => {
    const predicate = { not: { unconditional: true } };
    expect(claimPredicateDescribe(predicate)).toBe("Not (Unconditional)");
  });

  it("describes not with relative before child", () => {
    const predicate = { not: { relBefore: 120 } };
    expect(claimPredicateDescribe(predicate)).toBe(
      "Not (Within 120 seconds of creation)"
    );
  });

  it("describes double negation", () => {
    const predicate = { not: { not: { unconditional: true } } };
    expect(claimPredicateDescribe(predicate)).toBe("Not (Not (Unconditional))");
  });

  it("throws when not payload is not a valid object", () => {
    expect(() => claimPredicateDescribe({ not: null })).toThrow(
      ClaimPredicateDescribeError
    );
    expect(() => claimPredicateDescribe({ not: "invalid" })).toThrow(
      ClaimPredicateDescribeError
    );
  });
});
