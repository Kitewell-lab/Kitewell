import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("changeTrustWithFreighter custom limit", () => {
  it("submits a 1.5 limit formatted to seven decimal places", async () => {
    await changeTrustWithFreighter(SOURCE, "usdc", ISSUER, "1.5");

    expect(loadAccountMock).toHaveBeenCalledWith(SOURCE);
    expect(submitTransactionMock).toHaveBeenCalledTimes(1);

    const op = submitTransactionMock.mock.calls[0][0].operations[0];
    expect(op.type).toBe("changeTrust");
    expect(op.limit).toBe("1.5000000");
    expect(op.line.getCode()).toBe("USDC");
    expect(op.line.getIssuer()).toBe(ISSUER);
  });
});
