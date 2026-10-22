import { describe, it, expect } from "vitest";
import { claimPredicateDescribe } from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - and and or compound predicates", () => {
  it("describes multiple and branches wrapped in parentheses", () => {
    const predicate = {
      and: [
        { unconditional: true },
        { relBefore: 600 },
      ],
    };
    expect(claimPredicateDescribe(predicate)).toBe(
      "(Unconditional and Within 600 seconds of creation)"
    );
  });

  it("describes multiple or branches wrapped in parentheses", () => {
    const predicate = {
      or: [
        { relBefore: 300 },
        { absBefore: "2026-10-22T10:00:00.000Z" },
      ],
    };
    expect(claimPredicateDescribe(predicate)).toBe(
      "(Within 300 seconds of creation or Before 2026-10-22T10:00:00.000Z)"
    );
  });

  it("handles single-item and/or arrays without redundant parentheses", () => {
    expect(claimPredicateDescribe({ and: [{ unconditional: true }] })).toBe(
      "Unconditional"
    );
    expect(claimPredicateDescribe({ or: [{ relBefore: 50 }] })).toBe(
      "Within 50 seconds of creation"
    );
  });

  it("handles empty and/or array branches as always false", () => {
    expect(claimPredicateDescribe({ and: [] })).toBe("Always false");
    expect(claimPredicateDescribe({ or: [] })).toBe("Always false");
  });
});
