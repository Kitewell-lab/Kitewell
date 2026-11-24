import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Fee-split tests use a fixture simulation, and the register-simulation test
 * mocks the Soroban RPC server plus Freighter so nothing touches the network.
 */

const { sorobanServerMock, signTransactionMock } = vi.hoisted(() => ({
  sorobanServerMock: {
    simulateTransaction: vi.fn(),
    getAccount: vi.fn(),
    prepareTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn(),
  },
  signTransactionMock: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  setAllowed: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn().mockResolvedValue({}),
  signTransaction: signTransactionMock,
}));

vi.mock("./stellar", () => ({
  buildAsset: vi.fn(),
  parsePathAssets: vi.fn(),
  buildSetOptionsBody: vi.fn(),
  MAX_ASSET_CODE_LENGTH: 12,
  validateDataName: vi.fn(),
  validateDataValue: vi.fn(),
  validateAccountMerge: vi.fn(),
  getAccountMergeBlockers: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: vi.fn(function () {
        return sorobanServerMock;
      }),
    },
  };
});

const StellarSdk = await import("@stellar/stellar-sdk");
const {
  formatSimulationFee,
  isSimulationReady,
  parseSimulationFees,
} = await import("./simulationFees");
const {
  registerBuilderWithFreighter,
  simulateRegisterBuilder,
} = await import("./freighter");

const CONTRACT_ID =
  "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";
const USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const OTHER_ADDRESS = StellarSdk.StrKey.encodeEd25519PublicKey(
  Buffer.alloc(32, 1)
);

function authorizationEntry(address) {
  const credentials = StellarSdk.xdr.SorobanCredentials.sorobanCredentialsAddress(
    new StellarSdk.xdr.SorobanAddressCredentials({
      address: StellarSdk.nativeToScVal(address, { type: "address" }).address(),
      nonce: StellarSdk.xdr.Int64.fromString("0"),
      signatureExpirationLedger: 1,
      signature: StellarSdk.xdr.ScVal.scvVoid(),
    })
  );
  const rootInvocation = new StellarSdk.xdr.SorobanAuthorizedInvocation({
    function:
      StellarSdk.xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        {
          contractAddress: StellarSdk.nativeToScVal(CONTRACT_ID, {
            type: "address",
          }).address(),
          functionName: "register",
          args: [],
        }
      ),
    subInvocations: [],
  });

  return new StellarSdk.xdr.SorobanAuthorizationEntry({
    credentials,
    rootInvocation,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseSimulationFees", () => {
  it("shows the inclusion fee and the resource fee separately", () => {
    const fees = parseSimulationFees({ minResourceFee: "4321" }, "100");

    expect(fees).toEqual({
      error: null,
      inclusionFee: "100",
      resourceFee: "4321",
      totalFee: "4421",
    });
  });

  it("prefers a fee reported by the simulation", () => {
    const fees = parseSimulationFees(
      { minResourceFee: "500", inclusionFee: "150" },
      "100"
    );

    expect(fees.inclusionFee).toBe("150");
    expect(fees.totalFee).toBe("650");
  });

  it("marks a missing fee unavailable instead of zero", () => {
    const fees = parseSimulationFees({ minResourceFee: "500" });

    expect(fees.resourceFee).toBe("500");
    expect(fees.inclusionFee).toBeNull();
    expect(fees.totalFee).toBeNull();
    expect(formatSimulationFee(fees.inclusionFee)).toBe("unavailable");
  });

  it("shows neither fee when the simulation failed", () => {
    const fees = parseSimulationFees(
      { error: "host invocation failed" },
      "100"
    );

    expect(fees).toEqual({
      error: "host invocation failed",
      inclusionFee: null,
      resourceFee: null,
      totalFee: null,
    });
    expect(formatSimulationFee(fees.resourceFee)).toBe("unavailable");
  });

  it("only enables signing after a successful simulation for current inputs", () => {
    const formKey = JSON.stringify(["wallet", "network", "contract", "name"]);

    expect(
      isSimulationReady(
        { error: "Contract error" },
        formKey,
        formKey
      )
    ).toBe(false);
    expect(isSimulationReady(null, formKey, formKey)).toBe(false);
    expect(isSimulationReady({ error: null }, formKey, formKey)).toBe(true);
    expect(isSimulationReady({ error: null }, "old-inputs", formKey)).toBe(
      false
    );
  });
});

describe("simulateRegisterBuilder", () => {
  it("returns both fees from a fixture simulation and does not sign", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "7")
    );
    sorobanServerMock.simulateTransaction.mockResolvedValue({
      error: null,
      minResourceFee: "4321",
      result: {
        auth: [],
        retval: StellarSdk.nativeToScVal("registered", { type: "string" }),
      },
    });

    const fees = await simulateRegisterBuilder(USER, CONTRACT_ID, "alice");

    expect(fees).toEqual({
      error: null,
      inclusionFee: "100",
      resourceFee: "4321",
      totalFee: "4421",
      returnValue: "registered",
      authAddresses: [],
    });
    expect(sorobanServerMock.simulateTransaction).toHaveBeenCalledTimes(1);
    // Simulation is read-only: no Freighter prompt, no submission.
    expect(signTransactionMock).not.toHaveBeenCalled();
    expect(sorobanServerMock.sendTransaction).not.toHaveBeenCalled();
  });

  it("returns each address from the simulated authorization entries", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "7")
    );
    sorobanServerMock.simulateTransaction.mockResolvedValue({
      error: null,
      minResourceFee: "4321",
      result: {
        auth: [
          authorizationEntry(USER),
          authorizationEntry(OTHER_ADDRESS),
        ],
        retval: StellarSdk.nativeToScVal("registered", { type: "string" }),
      },
    });

    const simulation = await simulateRegisterBuilder(USER, CONTRACT_ID, "alice");

    expect(simulation.authAddresses).toEqual([USER, OTHER_ADDRESS]);
  });

  it("returns a contract simulation error for an empty name", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "7")
    );
    sorobanServerMock.simulateTransaction.mockResolvedValue({
      error: "Contract error: name cannot be empty",
    });

    await expect(
      simulateRegisterBuilder(USER, CONTRACT_ID, " ")
    ).resolves.toMatchObject({
      error: "Contract error: name cannot be empty",
      returnValue: null,
    });
    expect(sorobanServerMock.simulateTransaction).toHaveBeenCalledTimes(1);
    expect(signTransactionMock).not.toHaveBeenCalled();
  });

  it("does not mark a response without a result as signable", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "7")
    );
    sorobanServerMock.simulateTransaction.mockResolvedValue({});

    await expect(
      simulateRegisterBuilder(USER, CONTRACT_ID, "alice")
    ).resolves.toMatchObject({
      error: "Simulation returned no result.",
      returnValue: null,
    });
  });

  it("does not ask Freighter to sign when transaction preparation fails", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "7")
    );
    sorobanServerMock.prepareTransaction.mockRejectedValue(
      new Error("Contract simulation failed")
    );

    await expect(
      registerBuilderWithFreighter(USER, CONTRACT_ID, "alice")
    ).rejects.toThrow("Contract simulation failed");
    expect(signTransactionMock).not.toHaveBeenCalled();
  });
});
