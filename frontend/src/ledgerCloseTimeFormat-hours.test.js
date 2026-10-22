import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime hours scale", () => {
  const BASE_TIME = "2026-10-22T00:00:00.000Z";

  it("formats 60 minutes as 1h ago", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T01:00:00.000Z")).toBe("1h ago");
  });

  it("formats multi-hour intervals", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T05:30:00.000Z")).toBe("5h ago");
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T23:59:00.000Z")).toBe("23h ago");
  });
});
