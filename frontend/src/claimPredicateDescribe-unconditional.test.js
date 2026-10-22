import { describe, it, expect } from "vitest";
import { claimPredicateDescribe } from "./claimPredicateDescribe.js";

describe("claimPredicateDescribe - unconditional predicate", () => {
  it("describes standard unconditional predicate", () => {
    const predicate = { unconditional: true };
    expect(claimPredicateDescribe(predicate)).toBe("Unconditional");
  });

  it("handles unconditional predicate with truthy values", () => {
    expect(claimPredicateDescribe({ unconditional: 1 })).toBe("Unconditional");
  });

  it("describes explicit false unconditional predicate as never claimable", () => {
    expect(claimPredicateDescribe({ unconditional: false })).toBe("Never claimable");
  });
});
