import { describe, expect, it } from "vitest";
import { tryFormatTxHash } from "./txHashFormat";

const VALID_HASH = "deadbeef0123456789abcdef0123456789abcdef0123456789abcdef01234567";

describe("tryFormatTxHash safe formatting", () => {
  it("formats valid hash successfully", () => {
    expect(tryFormatTxHash(VALID_HASH)).toBe("deadbe…234567");
  });

  it("returns default fallback (null) on invalid hash without throwing", () => {
    expect(tryFormatTxHash("invalid-hash")).toBeNull();
    expect(tryFormatTxHash(null)).toBeNull();
  });

  it("returns custom fallback string when provided", () => {
    expect(tryFormatTxHash("short", {}, "N/A")).toBe("N/A");
  });
});
