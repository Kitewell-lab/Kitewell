import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CI-friendly tests locking trustline signing errors.
 * Freighter and Horizon are mocked; the real SDK builds the operation.
 * `signWithFreighter` surfaces the Freighter error message, or the fallback
 * "Transaction signing was rejected in Freighter.", and never submits.
 *
 * Closes #130
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

describe("trustline signing errors", () => {
  it("surfaces the Freighter error message and does not submit", async () => {
    signTransactionMock.mockResolvedValue({
      error: { message: "User declined" },
    });

    await expect(
      changeTrustWithFreighter(SOURCE, "USDC", ISSUER)
    ).rejects.toThrow("User declined");

    expect(submitTransactionMock).not.toHaveBeenCalled();
  });

  it("falls back to the rejection message and does not submit", async () => {
    signTransactionMock.mockResolvedValue({ error: {} });

    await expect(
      changeTrustWithFreighter(SOURCE, "USDC", ISSUER)
    ).rejects.toThrow("Transaction signing was rejected in Freighter.");

    expect(submitTransactionMock).not.toHaveBeenCalled();
  });
});
