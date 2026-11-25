import { describe, expect, it } from "vitest";
import { withoutClaimedBalance } from "./clawbackClaimableBalance";

function balance(hash) {
  return {
    id: `00000000${hash.repeat(64).slice(0, 64)}`,
    asset: `USDC:GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF`,
    amount: "5.0000000",
    source_account: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  };
}

describe("withoutClaimedBalance", () => {
  it("drops the clawed back balance from the unclaimed list", () => {
    const records = [balance("a"), balance("b")];
    const remaining = withoutClaimedBalance(records, balance("a").id);

    expect(remaining.map((r) => r.id)).toEqual([balance("b").id]);
  });

  it("accepts a bare hash id", () => {
    const records = [balance("a")];
    const hash = "a".repeat(64);

    expect(withoutClaimedBalance(records, hash)).toEqual([]);
  });

  it("keeps every other balance and does not mutate the input", () => {
    const records = [balance("a"), balance("b")];
    const remaining = withoutClaimedBalance(records, balance("c").id);

    expect(remaining).toHaveLength(2);
    expect(records).toHaveLength(2);
  });

  it("keeps a record with no usable id", () => {
    expect(withoutClaimedBalance([{ id: "not-an-id" }], balance("a").id)).toHaveLength(
      1
    );
  });

  it("rejects a non-array list", () => {
    expect(() => withoutClaimedBalance(null, balance("a").id)).toThrow(
      /records must be an array/
    );
  });

  it("drops a balance that was claimed between refreshes", () => {
    const claimed = { ...balance("a"), claimed: true };
    const remaining = withoutClaimedBalance(
      [claimed, balance("b")],
      balance("a").id
    );

    expect(remaining).toEqual([balance("b")]);
  });
});
