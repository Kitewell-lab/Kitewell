import { describe, it, expect } from "vitest";
import {
  claimPredicateDescribe,
  ClaimPredicateDescribeError,
} from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - invalid input handling", () => {
  it("throws TypeError for null, undefined, and non-object primitives", () => {
    expect(() => claimPredicateDescribe(null)).toThrow(TypeError);
    expect(() => claimPredicateDescribe(undefined)).toThrow(TypeError);
    expect(() => claimPredicateDescribe("string")).toThrow(TypeError);
    expect(() => claimPredicateDescribe(12345)).toThrow(TypeError);
    expect(() => claimPredicateDescribe(true)).toThrow(TypeError);
  });

  it("throws TypeError for array roots", () => {
    expect(() => claimPredicateDescribe([])).toThrow(TypeError);
  });

  it("throws ClaimPredicateDescribeError for empty object", () => {
    expect(() => claimPredicateDescribe({})).toThrow(ClaimPredicateDescribeError);
  });

  it("throws ClaimPredicateDescribeError for unrecognized predicate object shapes", () => {
    expect(() => claimPredicateDescribe({ foo: "bar" })).toThrow(
      ClaimPredicateDescribeError
    );
  });
});
