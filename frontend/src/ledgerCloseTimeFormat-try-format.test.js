import { describe, expect, it } from "vitest";
import { tryFormatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("tryFormatLedgerCloseTime safe formatting", () => {
  it("formats valid timestamp without throwing", () => {
    expect(tryFormatLedgerCloseTime("2026-10-22T12:00:00Z", "2026-10-22T12:00:10Z")).toBe("10s ago");
  });

  it("returns null default fallback on invalid input", () => {
    expect(tryFormatLedgerCloseTime("invalid-time")).toBeNull();
    expect(tryFormatLedgerCloseTime(null)).toBeNull();
  });

  it("returns custom fallback when specified", () => {
    expect(tryFormatLedgerCloseTime("bad-time", undefined, "--")).toBe("--");
  });
});
