import { describe, expect, it } from "vitest";
import { describeFriendbotResult } from "./friendbotResult";

const HASH = "a".repeat(64);

describe("describeFriendbotResult", () => {
  it("shows the transaction hash and links it to the explorer", () => {
    const view = describeFriendbotResult({ hash: HASH, successful: true });
    expect(view.hash).toBe(HASH);
    expect(view.explorerUrl).toMatch(new RegExp(`/tx/${HASH}$`));
    expect(view.message).toMatch(/Funded/);
  });

  it("falls back to the successful transaction hash field", () => {
    const view = describeFriendbotResult({ successful_transaction_hash: HASH });
    expect(view.hash).toBe(HASH);
  });

  it("says the hash was not returned when the response has none", () => {
    for (const result of [{}, { funded: true }, { hash: "not-a-hash" }, null, undefined]) {
      const view = describeFriendbotResult(result);
      expect(view.hash).toBeNull();
      expect(view.explorerUrl).toBeNull();
      expect(view.message).toMatch(/may be funded/);
      expect(view.message).toMatch(/did not return a transaction hash/);
    }
  });
});
