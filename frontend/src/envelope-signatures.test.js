import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Signatures already present on a pasted envelope are listed with their hint
 * and the signer they belong to, before any new signature is added.
 */

const { loadAccountMock, submitTransactionMock } = vi.hoisted(() => ({
  loadAccountMock: vi.fn(),
  submitTransactionMock: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  setAllowed: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(function () {
        return { loadAccount: loadAccountMock, submitTransaction: submitTransactionMock };
      }),
    },
  };
});

const StellarSdk = await import("@stellar/stellar-sdk");
const { getActiveNetwork } = await import("./network");
const { inspectMultisigEnvelope } = await import("./multisigEnvelope");
const { listEnvelopeSignatures } = await import("./stellar");

const source = StellarSdk.Keypair.random();
const cosigner = StellarSdk.Keypair.random();
const outsider = StellarSdk.Keypair.random();

function account() {
  return {
    signers: [
      { key: source.publicKey(), weight: 1, type: "ed25519_public_key" },
      { key: cosigner.publicKey(), weight: 1, type: "ed25519_public_key" },
    ],
    thresholds: { low_threshold: 1, med_threshold: 2, high_threshold: 2 },
  };
}

function fixture(signers = [source, cosigner]) {
  const tx = new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(source.publicKey(), "1"),
    { fee: "100", networkPassphrase: getActiveNetwork().passphrase }
  )
    .addOperation(
      StellarSdk.Operation.payment({
        destination: outsider.publicKey(),
        asset: StellarSdk.Asset.native(),
        amount: "1",
      })
    )
    .setTimeout(0)
    .build();
  signers.forEach((signer) => tx.sign(signer));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
  loadAccountMock.mockResolvedValue(account());
});

describe("signatures on a pasted envelope", () => {
  it("lists two fixture signatures with hints and marks the connected wallet", async () => {
    const tx = fixture();

    const summary = await inspectMultisigEnvelope(tx.toXDR(), source.publicKey());

    expect(summary.signatures).toHaveLength(2);
    expect(summary.signatures.map((row) => row.hint)).toEqual([
      source.signatureHint().toString("hex"),
      cosigner.signatureHint().toString("hex"),
    ]);
    expect(summary.signatures.map((row) => row.signer)).toEqual([
      source.publicKey(),
      cosigner.publicKey(),
    ]);
    expect(summary.signatures.map((row) => row.isConnected)).toEqual([true, false]);
    expect(summary.totalWeight).toBe(2);
    expect(summary.meets.medium).toBe(true);
  });

  it("labels a signature from a key outside the source account as unmatched", () => {
    const tx = fixture([source, outsider]);
    const rows = listEnvelopeSignatures(tx, account(), source.publicKey());

    expect(rows[1].status).toBe("unmatched");
    expect(rows[1].signer).toBeNull();
    expect(rows[1].matched).toBe(false);
  });

  it("shows the decode error without any signers", async () => {
    await expect(inspectMultisigEnvelope("not-an-envelope")).rejects.toThrow(
      /valid transaction envelope/
    );
    expect(loadAccountMock).not.toHaveBeenCalled();
  });
});
