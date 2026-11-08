import { describe, expect, it } from "vitest";
import { isValidTxHash } from "./txHashFormat";

const VALID_LOWER = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const VALID_UPPER = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

describe("isValidTxHash helper", () => {
  it("returns true for valid lowercase and uppercase 64-character hex hashes", () => {
    expect(isValidTxHash(VALID_LOWER)).toBe(true);
    expect(isValidTxHash(VALID_UPPER)).toBe(true);
    expect(isValidTxHash(`  ${VALID_LOWER}  `)).toBe(true);
  });

  it("returns false for non-string, wrong length, or non-hex inputs", () => {
    expect(isValidTxHash(null)).toBe(false);
    expect(isValidTxHash(undefined)).toBe(false);
    expect(isValidTxHash(123456)).toBe(false);
    expect(isValidTxHash("")).toBe(false);
    expect(isValidTxHash("0123456789abcdef")).toBe(false);
    expect(isValidTxHash("0123456789abcdef0123456789abcdef0123456789abcdef0123456789xyz123")).toBe(false);
  });
});
