import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime future handling", () => {
  const CLOSED_AT = "2026-10-22T12:00:05.000Z";
  const NOW = "2026-10-22T12:00:00.000Z"; // closedAt is 5s into the future relative to now

  it("returns 'just now' by default when closedAt is in the future", () => {
    expect(formatLedgerCloseTime(CLOSED_AT, NOW)).toBe("just now");
  });

  it("allows custom future fallback via options object", () => {
    expect(formatLedgerCloseTime(CLOSED_AT, { now: NOW, futureFallback: "upcoming" })).toBe("upcoming");
  });
});
