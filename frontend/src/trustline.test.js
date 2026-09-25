import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CI-friendly tests for `changeTrustWithFreighter`, focused on the limit-0
 * removal path used by the Assets tab. Freighter and Horizon are mocked; the
 * real SDK builds the operation.
 */

const { loadAccountMock, submitTransactionMock, signTransactionMock } =
  vi.hoisted(() => ({
    loadAccountMock: vi.fn(),
    submitTransactionMock: vi.fn(),
    signTransactionMock: vi.fn(),
  }));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  setAllowed: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: signTransactionMock,
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(function () {
        return {
          loadAccount: loadAccountMock,
          submitTransaction: submitTransactionMock,
        };
      }),
    },
  };
});

const StellarSdk = await import("@stellar/stellar-sdk");
const { changeTrustWithFreighter } = await import("./freighter");

const SOURCE = StellarSdk.Keypair.random().publicKey();
const ISSUER = StellarSdk.Keypair.random().publicKey();

beforeEach(() => {
  vi.clearAllMocks();
  loadAccountMock.mockResolvedValue(new StellarSdk.Account(SOURCE, "1"));
  submitTransactionMock.mockResolvedValue({ hash: "trusthash", ledger: 9 });
  signTransactionMock.mockImplementation(async (xdr) => ({
    signedTxXdr: xdr,
  }));
});

describe("changeTrustWithFreighter", () => {
  it("builds a changeTrust op with limit 0 to remove a trustline", async () => {
    await changeTrustWithFreighter(SOURCE, "usdc", ISSUER, "0");

    expect(loadAccountMock).toHaveBeenCalledWith(SOURCE);
    expect(submitTransactionMock).toHaveBeenCalledTimes(1);

    const op = submitTransactionMock.mock.calls[0][0].operations[0];
    expect(op.type).toBe("changeTrust");
    expect(op.limit).toBe("0.0000000");
    expect(op.line.getCode()).toBe("USDC");
    expect(op.line.getIssuer()).toBe(ISSUER);
  });

  it("defaults to a positive limit when none is given", async () => {
    await changeTrustWithFreighter(SOURCE, "USDC", ISSUER);

    const op = submitTransactionMock.mock.calls[0][0].operations[0];
    expect(parseFloat(op.limit)).toBeGreaterThan(0);
  });

  it("rejects an invalid issuer before submitting", async () => {
    await expect(
      changeTrustWithFreighter(SOURCE, "USDC", "not-a-key", "0")
    ).rejects.toThrow(/valid Stellar public key/);

    expect(submitTransactionMock).not.toHaveBeenCalled();
  });
});
