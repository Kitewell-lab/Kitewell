import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime, isValidLedgerCloseTime, InvalidLedgerTimeError } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime invalid input validation", () => {
  it("rejects null and undefined closedAt", () => {
    expect(isValidLedgerCloseTime(null)).toBe(false);
    expect(isValidLedgerCloseTime(undefined)).toBe(false);
    expect(() => formatLedgerCloseTime(null)).toThrow(InvalidLedgerTimeError);
    expect(() => formatLedgerCloseTime(undefined)).toThrow(InvalidLedgerTimeError);
  });

  it("rejects unparseable non-date strings", () => {
    expect(isValidLedgerCloseTime("not-a-date")).toBe(false);
    expect(() => formatLedgerCloseTime("not-a-date")).toThrow(InvalidLedgerTimeError);
  });

  it("rejects invalid injectable now values", () => {
    expect(() => formatLedgerCloseTime("2026-10-22T12:00:00Z", "invalid-now")).toThrow(InvalidLedgerTimeError);
  });
});
