import { describe, it, expect } from "vitest";
import { claimPredicateDescribe } from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - nested trees", () => {
  it("formats complex nested logic tree correctly", () => {
    const complexPredicate = {
      and: [
        { relBefore: 86400 },
        {
          or: [
            { unconditional: true },
            { not: { absBefore: "2026-12-31T23:59:59.000Z" } },
          ],
        },
      ],
    };

    expect(claimPredicateDescribe(complexPredicate)).toBe(
      "(Within 86400 seconds of creation and (Unconditional or Not (Before 2026-12-31T23:59:59.000Z)))"
    );
  });

  it("formats three-level deep nesting", () => {
    const tree = {
      or: [
        {
          and: [
            { relBefore: 10 },
            { not: { relBefore: 5 } },
          ],
        },
        { unconditional: true },
      ],
    };

    expect(claimPredicateDescribe(tree)).toBe(
      "((Within 10 seconds of creation and Not (Within 5 seconds of creation)) or Unconditional)"
    );
  });
});
