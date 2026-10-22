import { describe, it, expect } from "vitest";
import {
  claimPredicateDescribe,
  isPredicate,
  getPredicateType,
  ClaimPredicateDescribeError,
} from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - options and boundaries", () => {
  it("returns fallback string when throwOnError is false for invalid types", () => {
    expect(
      claimPredicateDescribe(null, { throwOnError: false, fallback: "Fallback" })
    ).toBe("Fallback");

    expect(
      claimPredicateDescribe({}, { throwOnError: false })
    ).toBe("Invalid predicate");
  });

  it("detects predicate types with getPredicateType", () => {
    expect(getPredicateType({ unconditional: true })).toBe("unconditional");
    expect(getPredicateType({ relBefore: 60 })).toBe("relBefore");
    expect(getPredicateType({ absBefore: "2026" })).toBe("absBefore");
    expect(getPredicateType({ and: [] })).toBe("and");
    expect(getPredicateType({ or: [] })).toBe("or");
    expect(getPredicateType({ not: {} })).toBe("not");
    expect(getPredicateType({})).toBe("unknown");
    expect(getPredicateType(null)).toBe("unknown");
  });

  it("validates predicate structures with isPredicate", () => {
    expect(isPredicate({ unconditional: true })).toBe(true);
    expect(isPredicate({ randomField: 123 })).toBe(false);
  });

  it("prevents stack overflow on excessive depth", () => {
    // Construct a deeply nested object
    let deep = { unconditional: true };
    for (let i = 0; i < 25; i++) {
      deep = { not: deep };
    }

    expect(() =>
      claimPredicateDescribe(deep, { maxDepth: 10, throwOnError: true })
    ).toThrow(ClaimPredicateDescribeError);
  });
});
