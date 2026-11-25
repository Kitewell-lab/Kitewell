import { describe, expect, it } from "vitest";
import {
  clawbackCandidates,
  listCreatedClaimableBalances,
} from "./clawbackClaimableBalance";

const CREATOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const OTHER = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ASSET = { authClawbackEnabled: true };

function balance(id, sourceAccount = CREATOR) {
  return {
    id: `00000000${id.repeat(64).slice(0, 64)}`,
    asset: `USDC:${CREATOR}`,
    amount: "1.0000000",
    source_account: sourceAccount,
  };
}

describe("listCreatedClaimableBalances", () => {
  it("lists only balances the connected account created", () => {
    const records = [balance("a"), balance("b", OTHER), balance("c")];

    expect(
      listCreatedClaimableBalances(records, CREATOR).map((r) => r.id)
    ).toEqual([balance("a").id, balance("c").id]);
  });

  it("never lists a balance someone else created", () => {
    expect(
      listCreatedClaimableBalances([balance("a", OTHER)], CREATOR)
    ).toEqual([]);
  });

  it("rejects a non-array list or a missing account", () => {
    expect(() => listCreatedClaimableBalances(null, CREATOR)).toThrow(
      /records must be an array/
    );
    expect(() => listCreatedClaimableBalances([], "")).toThrow(
      /account must be a public key/
    );
  });
});

describe("clawbackCandidates", () => {
  it("offers the account's own balances on a clawback-enabled asset", () => {
    const records = [balance("a"), balance("b", OTHER)];
    const candidates = clawbackCandidates({
      records,
      account: CREATOR,
      assetFlagsByAsset: { [`USDC:${CREATOR}`]: ASSET },
    });

    expect(candidates.map((r) => r.id)).toEqual([balance("a").id]);
  });

  it("hides every balance when the asset cannot claw back", () => {
    expect(
      clawbackCandidates({
        records: [balance("a")],
        account: CREATOR,
        assetFlagsByAsset: {
          [`USDC:${CREATOR}`]: { authClawbackEnabled: false },
        },
      })
    ).toEqual([]);
  });

  it("is empty without a book of records", () => {
    expect(clawbackCandidates({})).toEqual([]);
  });
});
