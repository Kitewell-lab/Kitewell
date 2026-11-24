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
const { formatSimulationFee, parseSimulationFees } = await import(
  "./simulationFees"
);
const { simulateRegisterBuilder } = await import("./freighter");

const CONTRACT_ID =
  "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";
const USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

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
        retval: StellarSdk.nativeToScVal(undefined, { type: "void" }),
      },
    });

    const fees = await simulateRegisterBuilder(USER, CONTRACT_ID, "alice");

    expect(fees).toEqual({
      error: null,
      inclusionFee: "100",
      resourceFee: "4321",
      totalFee: "4421",
    });
    expect(sorobanServerMock.simulateTransaction).toHaveBeenCalledTimes(1);
    // Simulation is read-only: no Freighter prompt, no submission.
    expect(signTransactionMock).not.toHaveBeenCalled();
    expect(sorobanServerMock.sendTransaction).not.toHaveBeenCalled();
  });
});
