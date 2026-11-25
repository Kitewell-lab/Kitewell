import { describe, expect, it } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import { clawbackClaimableBalanceOperation } from "./clawbackClaimableBalance";

const BALANCE_HASH = "ab".repeat(32);
const BALANCE_ID = `00000000${BALANCE_HASH}`;
const SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function buildTransaction(operation) {
  return new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(SOURCE, "1"),
    { fee: StellarSdk.BASE_FEE, networkPassphrase: StellarSdk.Networks.TESTNET }
  )
    .addOperation(operation)
    .setTimeout(30)
    .build();
}

describe("clawbackClaimableBalanceOperation", () => {
  it("builds clawbackClaimableBalance for one fixture id", () => {
    const transaction = buildTransaction(
      clawbackClaimableBalanceOperation(BALANCE_ID)
    );
    const [operation] = transaction.operations;

    expect(operation.type).toBe("clawbackClaimableBalance");
    expect(operation.balanceId).toBe(BALANCE_ID);
  });

  it("accepts a bare 64-hex hash and adds the type prefix", () => {
    const transaction = buildTransaction(
      clawbackClaimableBalanceOperation(BALANCE_HASH)
    );

    expect(transaction.operations[0].balanceId).toBe(BALANCE_ID);
  });

  it("carries exactly one operation", () => {
    const transaction = buildTransaction(
      clawbackClaimableBalanceOperation(BALANCE_ID)
    );

    expect(transaction.operations).toHaveLength(1);
  });

  it("refuses an id that is not a claimable balance id", () => {
    expect(() => clawbackClaimableBalanceOperation("")).toThrow(/required/);
    expect(() => clawbackClaimableBalanceOperation("not-hex")).toThrow(
      /hexadecimal/
    );
    expect(() => clawbackClaimableBalanceOperation("ab".repeat(10))).toThrow(
      /64 hex characters/
    );
    expect(() => clawbackClaimableBalanceOperation(`00000001${BALANCE_HASH}`)).toThrow(
      /type-0/
    );
  });
});
