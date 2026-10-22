import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime injectable now timestamp", () => {
  const CLOSED_AT = "2026-10-22T10:00:00.000Z";
  const NOW_DATE = new Date("2026-10-22T10:02:00.000Z"); // 2 minutes later
  const NOW_MS = NOW_DATE.getTime();

  it("accepts a Date object as injectable now", () => {
    expect(formatLedgerCloseTime(CLOSED_AT, NOW_DATE)).toBe("2m ago");
  });

  it("accepts a numeric millisecond timestamp as injectable now", () => {
    expect(formatLedgerCloseTime(CLOSED_AT, NOW_MS)).toBe("2m ago");
  });

  it("accepts options object with now property", () => {
    expect(formatLedgerCloseTime(CLOSED_AT, { now: NOW_DATE })).toBe("2m ago");
  });
});
