import { describe, expect, it } from "vitest";
import { classifyClaimPredicate } from "./stellar";

const NOW = Date.parse("2026-11-24T12:00:00.000Z");

describe("classifyClaimPredicate", () => {
  it("marks an unconditional predicate as claimable now", () => {
    expect(classifyClaimPredicate({ unconditional: true }, NOW)).toEqual({
      status: "claimable",
      opensAt: null,
    });
  });

  it("marks a future-time predicate as not yet claimable with its opening time", () => {
    const opensAt = "2026-12-01T00:00:00.000Z";
    expect(
      classifyClaimPredicate({ not: { abs_before: opensAt } }, NOW)
    ).toEqual({
      status: "not-yet",
      opensAt,
    });
  });

  it("marks a passed not-before predicate as claimable", () => {
    expect(
      classifyClaimPredicate(
        { not: { abs_before: "2026-11-01T00:00:00.000Z" } },
        NOW
      )
    ).toEqual({ status: "claimable", opensAt: null });
  });

  it("marks an unreadable predicate as unknown", () => {
    expect(classifyClaimPredicate({ and: [{ foo: 1 }] }, NOW)).toEqual({
      status: "unknown",
      opensAt: null,
    });
    expect(classifyClaimPredicate(null, NOW)).toEqual({
      status: "unknown",
      opensAt: null,
    });
  });
});
