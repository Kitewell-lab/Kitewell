import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CI-friendly tests locking Horizon submit failures and the passphrase handed
 * to Freighter. Freighter and Horizon are mocked; the real SDK builds the
 * operation. The signing options must follow the active network.
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
const { sendPaymentWithFreighter } = await import("./freighter");
const { setActiveNetwork } = await import("./network");

const SOURCE = StellarSdk.Keypair.random().publicKey();
const DESTINATION = StellarSdk.Keypair.random().publicKey();

beforeEach(() => {
  setActiveNetwork("TESTNET");
  vi.clearAllMocks();
  loadAccountMock.mockResolvedValue(new StellarSdk.Account(SOURCE, "1"));
  submitTransactionMock.mockResolvedValue({ hash: "submitoptshash", ledger: 3 });
  signTransactionMock.mockImplementation(async (xdr) => ({
    signedTxXdr: xdr,
  }));
});

afterEach(() => {
  setActiveNetwork("TESTNET");
});

describe("payment submit options", () => {
  it("propagates a Horizon submit failure unchanged", async () => {
    const submitError = new Error("Horizon submit failed");
    submitTransactionMock.mockRejectedValue(submitError);

    await expect(
      sendPaymentWithFreighter(SOURCE, DESTINATION, "10")
    ).rejects.toBe(submitError);
  });

  it("signs on Testnet with the TESTNET passphrase and source address", async () => {
    await sendPaymentWithFreighter(SOURCE, DESTINATION, "10");

    expect(signTransactionMock).toHaveBeenCalledTimes(1);
    expect(signTransactionMock.mock.calls[0][1]).toEqual({
      networkPassphrase: StellarSdk.Networks.TESTNET,
      address: SOURCE,
    });
  });

  it("signs on Futurenet with the FUTURENET passphrase", async () => {
    setActiveNetwork("FUTURENET");

    await sendPaymentWithFreighter(SOURCE, DESTINATION, "10");

    expect(signTransactionMock.mock.calls[0][1].networkPassphrase).toBe(
      StellarSdk.Networks.FUTURENET
    );
  });
});
