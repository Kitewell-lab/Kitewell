import { beforeEach, describe, expect, it, vi } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  buildSponsoredCreateAccountTransaction,
  createSponsoredAccountDraft,
  describeSponsoredCreateAccountOperations,
  normalizeSponsoredStartingBalance,
  sponsorAccountCreationWithFreighter,
} from "./sponsoredAccountCreate";

/**
 * Issue #669: one form takes the new account and the starting balance and
 * builds begin sponsoring, create account and end sponsoring, in that order,
 * in one transaction. The confirmation lists the three operations before
 * Freighter opens.
 */

const SPONSOR = StellarSdk.Keypair.random();
const NEW_ACCOUNT = StellarSdk.Keypair.random();
const OTHER_ACCOUNT = StellarSdk.Keypair.random();

function horizonStub({ existing = false } = {}) {
  return {
    loadAccount: vi.fn().mockImplementation(async (address) => {
      if (address === SPONSOR.publicKey()) {
        return new StellarSdk.Account(SPONSOR.publicKey(), "5");
      }
      if (existing && address === NEW_ACCOUNT.publicKey()) {
        return new StellarSdk.Account(NEW_ACCOUNT.publicKey(), "1");
      }
      const error = new Error("Not found");
      error.response = { status: 404 };
      throw error;
    }),
    submitTransaction: vi.fn().mockResolvedValue({
      hash: "b".repeat(64),
      successful: true,
    }),
  };
}

function draftXdr({ newAccount = NEW_ACCOUNT, startingBalance = "0", sequence = "5" } = {}) {
  return buildSponsoredCreateAccountTransaction({
    sponsor: SPONSOR.publicKey(),
    newAccount: newAccount.publicKey(),
    startingBalance,
    sequence,
  }).toXDR();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeSponsoredStartingBalance", () => {
  it("keeps a valid starting balance and normalizes it to 7 decimals", () => {
    expect(normalizeSponsoredStartingBalance("2.5")).toBe("2.5000000");
    expect(normalizeSponsoredStartingBalance("0")).toBe("0.0000000");
    expect(normalizeSponsoredStartingBalance("0.0000001")).toBe("0.0000001");
  });

  it("refuses malformed or negative amounts", () => {
    for (const value of ["-1", "abc", "1.12345678", ""]) {
      expect(() => normalizeSponsoredStartingBalance(value)).toThrow(
        /non-negative number/
      );
    }
  });

  it("refuses a starting balance below the configured minimum", () => {
    expect(() =>
      normalizeSponsoredStartingBalance("0.5", { minimum: "1" })
    ).toThrow(/at least 1 XLM/);
    expect(normalizeSponsoredStartingBalance("1", { minimum: "1" })).toBe(
      "1.0000000"
    );
  });
});

describe("buildSponsoredCreateAccountTransaction", () => {
  it("builds the three operations in order in one transaction for a fixture", () => {
    const transaction = buildSponsoredCreateAccountTransaction({
      sponsor: SPONSOR.publicKey(),
      newAccount: NEW_ACCOUNT.publicKey(),
      startingBalance: "2",
      sequence: "5",
    });

    expect(transaction.operations).toHaveLength(3);
    expect(transaction.source).toBe(SPONSOR.publicKey());

    const [begin, create, end] = transaction.operations;
    expect(begin.type).toBe("beginSponsoringFutureReserves");
    expect(begin.sponsoredId).toBe(NEW_ACCOUNT.publicKey());

    expect(create.type).toBe("createAccount");
    expect(create.destination).toBe(NEW_ACCOUNT.publicKey());
    expect(Number(create.startingBalance)).toBe(2);

    // The protocol requires the sponsored account to be the source of the
    // closing operation, so it co-signs the envelope.
    expect(end.type).toBe("endSponsoringFutureReserves");
    expect(end.source).toBe(NEW_ACCOUNT.publicKey());
  });

  it("does not sign while building", () => {
    const transaction = buildSponsoredCreateAccountTransaction({
      sponsor: SPONSOR.publicKey(),
      newAccount: NEW_ACCOUNT.publicKey(),
      sequence: "5",
    });

    expect(transaction.signatures).toHaveLength(0);
  });

  it("refuses an invalid or already connected new account", () => {
    expect(() =>
      buildSponsoredCreateAccountTransaction({
        sponsor: SPONSOR.publicKey(),
        newAccount: "not-a-key",
      })
    ).toThrow(/valid Stellar public key/);

    expect(() =>
      buildSponsoredCreateAccountTransaction({
        sponsor: SPONSOR.publicKey(),
        newAccount: SPONSOR.publicKey(),
      })
    ).toThrow(/itself is not allowed/);
  });

  it("refuses a starting balance below the minimum before building", () => {
    expect(() =>
      buildSponsoredCreateAccountTransaction({
        sponsor: SPONSOR.publicKey(),
        newAccount: NEW_ACCOUNT.publicKey(),
        startingBalance: "-1",
      })
    ).toThrow(/non-negative number/);
  });
});

describe("describeSponsoredCreateAccountOperations", () => {
  it("lists the three operations with their sources for the confirmation", () => {
    const operations = describeSponsoredCreateAccountOperations({
      sponsor: SPONSOR.publicKey(),
      newAccount: NEW_ACCOUNT.publicKey(),
      startingBalance: "2",
    });

    expect(operations.map((operation) => operation.operation)).toEqual([
      "beginSponsoringFutureReserves",
      "createAccount",
      "endSponsoringFutureReserves",
    ]);
    expect(operations[0].source).toBe(SPONSOR.publicKey());
    expect(operations[2].source).toBe(NEW_ACCOUNT.publicKey());
    expect(operations[1].detail).toContain("2.0000000 XLM");
  });
});

describe("createSponsoredAccountDraft", () => {
  it("returns the operations of the draft the user reviews before signing", async () => {
    const server = horizonStub();

    const draft = await createSponsoredAccountDraft(
      SPONSOR.publicKey(),
      { newAccount: NEW_ACCOUNT.publicKey(), startingBalance: "2" },
      { server }
    );

    expect(draft.operations).toHaveLength(3);
    expect(draft.operations[2].source).toBe(NEW_ACCOUNT.publicKey());
    expect(draft.startingBalance).toBe("2.0000000");
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      draft.xdr,
      StellarSdk.Networks.TESTNET
    );
    expect(transaction.operations).toHaveLength(3);
  });

  it("refuses a new account that already exists", async () => {
    const server = horizonStub({ existing: true });

    await expect(
      createSponsoredAccountDraft(
        SPONSOR.publicKey(),
        { newAccount: NEW_ACCOUNT.publicKey(), startingBalance: "2" },
        { server }
      )
    ).rejects.toThrow(/already exists/);

    expect(server.submitTransaction).not.toHaveBeenCalled();
  });
});

describe("sponsorAccountCreationWithFreighter", () => {
  it("refuses a missing second signature without signing or submitting", async () => {
    const server = horizonStub();
    const sign = vi.fn();

    await expect(
      sponsorAccountCreationWithFreighter(
        SPONSOR.publicKey(),
        { newAccount: NEW_ACCOUNT.publicKey(), startingBalance: "0", coSignedXdr: "" },
        { server, sign }
      )
    ).rejects.toThrow(/co-sign/);

    expect(server.loadAccount).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
    expect(server.submitTransaction).not.toHaveBeenCalled();
  });

  it("refuses an envelope without the new account's signature", async () => {
    const server = horizonStub();
    const sign = vi.fn();

    await expect(
      sponsorAccountCreationWithFreighter(
        SPONSOR.publicKey(),
        {
          newAccount: NEW_ACCOUNT.publicKey(),
          startingBalance: "0",
          coSignedXdr: draftXdr(),
        },
        { server, sign }
      )
    ).rejects.toThrow(/missing the new account's signature/);

    expect(sign).not.toHaveBeenCalled();
    expect(server.submitTransaction).not.toHaveBeenCalled();
  });

  it("refuses a co-signed envelope for a different starting balance", async () => {
    const server = horizonStub();
    const coSigned = StellarSdk.TransactionBuilder.fromXDR(
      draftXdr({ startingBalance: "5" }),
      StellarSdk.Networks.TESTNET
    );
    coSigned.sign(NEW_ACCOUNT);

    await expect(
      sponsorAccountCreationWithFreighter(
        SPONSOR.publicKey(),
        {
          newAccount: NEW_ACCOUNT.publicKey(),
          startingBalance: "2",
          coSignedXdr: coSigned.toXDR(),
        },
        { server, sign: vi.fn() }
      )
    ).rejects.toThrow(/does not match this sponsorship transaction/);

    expect(server.submitTransaction).not.toHaveBeenCalled();
  });

  it("submits the three-operation transaction once the new account has co-signed", async () => {
    const server = horizonStub();
    const coSigned = StellarSdk.TransactionBuilder.fromXDR(
      draftXdr({ startingBalance: "2" }),
      StellarSdk.Networks.TESTNET
    );
    coSigned.sign(NEW_ACCOUNT);

    const signer = StellarSdk.Keypair.random();
    const sign = vi.fn(async (xdr) => {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        xdr,
        StellarSdk.Networks.TESTNET
      );
      transaction.sign(signer);
      return { signedTxXdr: transaction.toXDR() };
    });

    const result = await sponsorAccountCreationWithFreighter(
      SPONSOR.publicKey(),
      {
        newAccount: NEW_ACCOUNT.publicKey(),
        startingBalance: "2",
        coSignedXdr: coSigned.toXDR(),
      },
      { server, sign }
    );

    expect(sign).toHaveBeenCalledTimes(1);
    expect(server.submitTransaction).toHaveBeenCalledTimes(1);
    const submitted = server.submitTransaction.mock.calls[0][0];
    expect(submitted.operations.map((operation) => operation.type)).toEqual([
      "beginSponsoringFutureReserves",
      "createAccount",
      "endSponsoringFutureReserves",
    ]);
    expect(submitted.operations[1].startingBalance).toBe("2.0000000");
    expect(result).toMatchObject({
      newAccount: NEW_ACCOUNT.publicKey(),
      sponsor: SPONSOR.publicKey(),
      startingBalance: "2.0000000",
      confirmed: true,
    });
  });

  it("never submits when the co-signing account is the wrong one", async () => {
    const server = horizonStub();
    const wrong = StellarSdk.TransactionBuilder.fromXDR(
      draftXdr({ startingBalance: "2", newAccount: OTHER_ACCOUNT }),
      StellarSdk.Networks.TESTNET
    );
    wrong.sign(OTHER_ACCOUNT);

    await expect(
      sponsorAccountCreationWithFreighter(
        SPONSOR.publicKey(),
        {
          newAccount: NEW_ACCOUNT.publicKey(),
          startingBalance: "2",
          coSignedXdr: wrong.toXDR(),
        },
        { server, sign: vi.fn() }
      )
    ).rejects.toThrow(/does not match this sponsorship transaction/);

    expect(server.submitTransaction).not.toHaveBeenCalled();
  });
});
