import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

describe("formatTxHash invalid inputs", () => {
  it("throws when txHash is null or undefined", () => {
    expect(() => formatTxHash(null)).toThrow("Transaction hash must be a string.");
    expect(() => formatTxHash(undefined)).toThrow("Transaction hash must be a string.");
  });

  it("throws when txHash is a number or boolean", () => {
    expect(() => formatTxHash(123456)).toThrow("Transaction hash must be a string.");
    expect(() => formatTxHash(true)).toThrow("Transaction hash must be a string.");
  });

  it("throws when txHash is empty or whitespace-only", () => {
    expect(() => formatTxHash("")).toThrow("Transaction hash is required.");
    expect(() => formatTxHash("   ")).toThrow("Transaction hash is required.");
  });
});
