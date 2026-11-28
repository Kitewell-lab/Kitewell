import { describe, expect, it } from "vitest";
import { mergeBlockersFromAccount } from "./stellar";

describe("mergeBlockersFromAccount", () => {
  it("refuses while a trustline remains", () => {
    const account = {
      balances: [{ asset_type: "credit_alphanum4", asset_code: "USDC" }],
      signers: [{ key: "G..." }],
    };
    expect(
      mergeBlockersFromAccount(account).some((b) => /Trustlines/i.test(b))
    ).toBe(true);
  });

  it("allows a clean account with only the master signer", () => {
    const account = {
      balances: [{ asset_type: "native" }],
      signers: [{ key: "G..." }],
    };
    expect(mergeBlockersFromAccount(account)).toEqual([]);
  });

  it("also blocks data entries and created claimable balances", () => {
    const account = {
      balances: [{ asset_type: "native" }],
      signers: [{ key: "G..." }],
      dataEntries: [{ name: "foo" }],
      createdClaimableBalances: [{ id: "CB1" }],
    };
    const blockers = mergeBlockersFromAccount(account);
    expect(blockers.some((b) => /Data entries/i.test(b))).toBe(true);
    expect(
      blockers.some((b) => /Created claimable balances/i.test(b))
    ).toBe(true);
  });
});
