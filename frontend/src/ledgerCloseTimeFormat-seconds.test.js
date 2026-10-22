import { describe, expect, it } from "vitest";
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

describe("formatLedgerCloseTime seconds scale", () => {
  const BASE_TIME = "2026-10-22T12:00:00.000Z";

  it("formats 0s difference as 0s ago", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:00:00.000Z")).toBe("0s ago");
  });

  it("formats small second intervals accurately", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:00:05.000Z")).toBe("5s ago");
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:00:45.000Z")).toBe("45s ago");
  });

  it("formats upper boundary of seconds (59s) before minute transition", () => {
    expect(formatLedgerCloseTime(BASE_TIME, "2026-10-22T12:00:59.999Z")).toBe("59s ago");
  });
});
