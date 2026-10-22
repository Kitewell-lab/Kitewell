import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime days scale", () => {
  const BASE_TIME = "2026-10-01T00:00:00.000Z";

  it("formats 24 hours as 1d ago", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-02T00:00:00.000Z")).toBe("1d ago");
  });

  it("formats multiple days accurately", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-08T00:00:00.000Z")).toBe("7d ago");
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-31T00:00:00.000Z")).toBe("30d ago");
  });
});
