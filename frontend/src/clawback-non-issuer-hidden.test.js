import { describe, expect, it } from "vitest";
import { canClawbackClaimableBalance } from "./clawbackClaimableBalance";

const ISSUER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const OTHER = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const BALANCE = {
  id: `00000000${"ab".repeat(32)}`,
  asset: `USDC:${ISSUER}`,
  amount: "10.0000000",
  source_account: ISSUER,
  claimants: [{ destination: OTHER, predicate: { unconditional: true } }],
};

describe("canClawbackClaimableBalance", () => {
  it("offers clawback to the issuer of a clawback-enabled asset", () => {
    expect(
      canClawbackClaimableBalance({
        balance: BALANCE,
        account: ISSUER,
        assetFlags: { authClawbackEnabled: true },
      })
    ).toBe(true);
  });

  it("hides the action for a non-issuer", () => {
    expect(
      canClawbackClaimableBalance({
        balance: BALANCE,
        account: OTHER,
        assetFlags: { authClawbackEnabled: true },
      })
    ).toBe(false);
  });

  it("hides the action when the asset has no clawback", () => {
    expect(
      canClawbackClaimableBalance({
        balance: BALANCE,
        account: ISSUER,
        assetFlags: { authClawbackEnabled: false },
      })
    ).toBe(false);
    expect(
      canClawbackClaimableBalance({
        balance: BALANCE,
        account: ISSUER,
        assetFlags: { auth_clawback_enabled: false },
      })
    ).toBe(false);
    expect(
      canClawbackClaimableBalance({ balance: BALANCE, account: ISSUER })
    ).toBe(false);
  });

  it("accepts Horizon's snake_case flags", () => {
    expect(
      canClawbackClaimableBalance({
        balance: BALANCE,
        account: ISSUER,
        assetFlags: { auth_clawback_enabled: true },
      })
    ).toBe(true);
  });

  it("hides the action for native XLM", () => {
    expect(
      canClawbackClaimableBalance({
        balance: { ...BALANCE, asset: "native" },
        account: ISSUER,
        assetFlags: { authClawbackEnabled: true },
      })
    ).toBe(false);
  });

  it("hides the action for an already claimed balance", () => {
    expect(
      canClawbackClaimableBalance({
        balance: { ...BALANCE, claimed: true },
        account: ISSUER,
        assetFlags: { authClawbackEnabled: true },
      })
    ).toBe(false);
  });

  it("rejects a balance that is not a record", () => {
    expect(() =>
      canClawbackClaimableBalance({ balance: null, account: ISSUER })
    ).toThrow(/balance must be an object/);
  });
});
