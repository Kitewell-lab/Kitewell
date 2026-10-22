import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime minutes scale", () => {
  const BASE_TIME = "2026-10-22T12:00:00.000Z";

  it("formats exactly 60 seconds as 1m ago", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:01:00.000Z")).toBe("1m ago");
  });

  it("formats multi-minute intervals", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:03:00.000Z")).toBe("3m ago");
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:25:30.000Z")).toBe("25m ago");
  });

  it("formats boundary minute at 59 minutes", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:59:59.000Z")).toBe("59m ago");
  });
});
