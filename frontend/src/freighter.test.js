import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CI-friendly tests for the Soroban helpers in ./freighter.
 *
 * Nothing here touches the network or a real wallet:
 * - `StellarSdk.rpc.Server` is mocked so simulate/prepare/send/poll are fake.
 * - `@stellar/freighter-api` `signTransaction` is mocked.
 * - The real SDK is used for tx building, XDR round-trips, and scVal decoding.
 */

const { sorobanServerMock, signTransactionMock } = vi.hoisted(() => ({
  sorobanServerMock: {
    simulateTransaction: vi.fn(),
    prepareTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getAccount: vi.fn(),
  },
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
  SOROBAN_RPC_URL,
  readKitewellState,
  registerBuilderWithFreighter,
} = await import("./freighter");

const CONTRACT_ID =
  "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";
const USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/** Build the same tx shape the helpers build, for XDR round-trip asserts. */
function buildRegisterTx(caller, name, sequence = "7") {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  return new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(caller, sequence),
    {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    }
  )
    .addOperation(
      contract.call(
        "register",
        StellarSdk.nativeToScVal(caller, { type: "address" }),
        StellarSdk.nativeToScVal(name, { type: "string" })
      )
    )
    .setTimeout(60)
    .build();
}

/** Soroban RPC getAccount payload the tx builder can consume. */
function rpcAccountFixture(address) {
  return new StellarSdk.Account(address, "7");
}

/** Minimal successful sim response for a read (lab_name / builder_count / get_builder). */
function simOk(retval) {
  return { error: null, result: { retval } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("soroban rpc url", () => {
  it("points at the public testnet Soroban RPC", () => {
    expect(SOROBAN_RPC_URL).toBe("https://soroban-testnet.stellar.org");
  });
});

describe("readKitewellState", () => {
  it("decodes lab_name, builder_count, and get_builder(Some)", async () => {
    sorobanServerMock.simulateTransaction.mockImplementation(async (tx) => {
      const method = tx.operations[0].func.value().functionName();
      if (method === "lab_name") return simOk(StellarSdk.nativeToScVal("Kitewell", { type: "string" }));
      if (method === "builder_count") return simOk(StellarSdk.nativeToScVal(2, { type: "u32" }));
      if (method === "get_builder")
        return simOk(
          StellarSdk.xdr.ScVal.scvVec([
            StellarSdk.nativeToScVal("alice", { type: "string" }),
          ])
        );
      throw new Error(`unexpected method ${method}`);
    });

    const state = await readKitewellState(CONTRACT_ID, USER);

    expect(state).toEqual({
      labName: "Kitewell",
      builderCount: 2,
      builder: "alice",
    });
    // Three parallel reads, each a single invokeHostFunction op.
    expect(sorobanServerMock.simulateTransaction).toHaveBeenCalledTimes(3);
    const ops = sorobanServerMock.simulateTransaction.mock.calls.map(
      ([tx]) => tx.operations[0]
    );
    expect(ops.map((op) => op.func.value().functionName())).toEqual([
      "lab_name",
      "builder_count",
      "get_builder",
    ]);
  });

  it("returns null for get_builder(None) and 0 count on a fresh registry", async () => {
    sorobanServerMock.simulateTransaction.mockImplementation(async (tx) => {
      const method = tx.operations[0].func.value().functionName();
      if (method === "lab_name") return simOk(StellarSdk.nativeToScVal("Kitewell", { type: "string" }));
      if (method === "builder_count") return simOk(StellarSdk.nativeToScVal(0, { type: "u32" }));
      return simOk(StellarSdk.xdr.ScVal.scvVec([]));
    });

    const state = await readKitewellState(CONTRACT_ID, null);

    expect(state).toEqual({ labName: "Kitewell", builderCount: 0, builder: null });
  });

  it("falls back to the zero address when no viewer is passed", async () => {
    sorobanServerMock.simulateTransaction.mockImplementation(async (tx) => {
      const method = tx.operations[0].func.value().functionName();
      if (method === "get_builder") {
        const caller = tx.operations[0].func.value().args()[0];
        return simOk(caller);
      }
      return simOk(StellarSdk.nativeToScVal("Kitewell", { type: "string" }));
    });

    const state = await readKitewellState(CONTRACT_ID, null);

    expect(state.builder).toBe(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
    );
  });

  it("throws a method-tagged error when a simulation fails", async () => {
    sorobanServerMock.simulateTransaction.mockResolvedValue({
      error: "Storage access exceeded",
    });

    await expect(readKitewellState(CONTRACT_ID, USER)).rejects.toThrow(
      "lab_name() simulation failed: Storage access exceeded"
    );
  });

  it("rejects non-contract ids before any RPC call", async () => {
    await expect(readKitewellState("GAAAAWTF", USER)).rejects.toThrow(
      "valid Soroban contract"
    );
    expect(sorobanServerMock.simulateTransaction).not.toHaveBeenCalled();
  });
});

describe("registerBuilderWithFreighter", () => {
  it("signs via Freighter, submits, polls, and returns hash + returnValue", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    const unsigned = buildRegisterTx(USER, "  stellar-alice  ");
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) => {
      // Mirror prepareTransaction: simulate then assemble.
      const sim = {
        _parsed: true,
        transactionData: new StellarSdk.SorobanDataBuilder().setResourceFee(
          "4321"
        ),
        minResourceFee: "123",
        result: { auth: [], retval: StellarSdk.nativeToScVal(undefined, { type: "void" }) },
      };
      return StellarSdk.rpc.assembleTransaction(tx, sim).build();
    });
    signTransactionMock.mockResolvedValue({
      error: null,
      signedTxXdr: unsigned.toXDR(), // reuse the same tx as "signed"
    });
    sorobanServerMock.sendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: "abc123def456",
    });
    sorobanServerMock.getTransaction.mockResolvedValue({
      status: "SUCCESS",
      returnValue: StellarSdk.nativeToScVal(undefined, { type: "void" }),
    });

    const result = await registerBuilderWithFreighter(USER, CONTRACT_ID, "  stellar-alice  ");

    expect(result).toEqual({
      hash: "abc123def456",
      returnValue: null, // void() decodes to null
      confirmed: true,
    });

    // Freighter was asked to sign the prepared tx XDR.
    expect(signTransactionMock).toHaveBeenCalledTimes(1);
    const [xdr, opts] = signTransactionMock.mock.calls[0];
    expect(opts).toEqual({
      networkPassphrase: StellarSdk.Networks.TESTNET,
      address: USER,
    });
    const signedForFreighter = StellarSdk.TransactionBuilder.fromXDR(
      xdr,
      StellarSdk.Networks.TESTNET
    );
    expect(signedForFreighter.fee).toBe("4421"); // assembled: 4321 resource + 100 inclusion

    // The invoke carries caller + trimmed name.
    const invoke = signedForFreighter.operations[0].func.value();
    // After an XDR round-trip the name comes back as an ScBytes Buffer.
    expect(invoke.functionName().toString()).toBe("register");
    expect(StellarSdk.scValToNative(invoke.args()[0])).toBe(USER);
    expect(StellarSdk.scValToNative(invoke.args()[1])).toBe("stellar-alice");

    // Submitted via Soroban RPC and polled to SUCCESS.
    expect(sorobanServerMock.sendTransaction).toHaveBeenCalledTimes(1);
    expect(sorobanServerMock.getTransaction).toHaveBeenCalledWith("abc123def456");
  });

  it("throws a hash-tagged error when submission is rejected (ERROR)", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    const unsigned = buildRegisterTx(USER, "alice");
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
      StellarSdk.rpc
        .assembleTransaction(tx, {
          _parsed: true,
          transactionData: new StellarSdk.SorobanDataBuilder(),
          minResourceFee: "0",
          result: { auth: [], retval: StellarSdk.nativeToScVal(undefined, { type: "void" }) },
        })
        .build()
    );
    signTransactionMock.mockResolvedValue({ error: null, signedTxXdr: unsigned.toXDR() });
    sorobanServerMock.sendTransaction.mockResolvedValue({
      status: "ERROR",
      hash: "deadbeef",
    });

    await expect(registerBuilderWithFreighter(USER, CONTRACT_ID, "alice")).rejects.toThrow(
      "Contract invoke rejected by the network. Tx hash: deadbeef"
    );
    expect(sorobanServerMock.getTransaction).not.toHaveBeenCalled();
  });

  it("throws a hash-tagged error when the tx fails on-chain (FAILED)", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    const unsigned = buildRegisterTx(USER, "alice");
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
      StellarSdk.rpc
        .assembleTransaction(tx, {
          _parsed: true,
          transactionData: new StellarSdk.SorobanDataBuilder(),
          minResourceFee: "0",
          result: { auth: [], retval: StellarSdk.nativeToScVal(undefined, { type: "void" }) },
        })
        .build()
    );
    signTransactionMock.mockResolvedValue({ error: null, signedTxXdr: unsigned.toXDR() });
    sorobanServerMock.sendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: "feedface",
    });
    sorobanServerMock.getTransaction.mockResolvedValue({ status: "FAILED" });

    await expect(registerBuilderWithFreighter(USER, CONTRACT_ID, "alice")).rejects.toThrow(
      "Contract invoke failed on-chain. Tx hash: feedface"
    );
  });

  it("returns confirmed:false when polling times out", async () => {
    vi.useFakeTimers();
    try {
      sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
      const unsigned = buildRegisterTx(USER, "alice");
      sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
        StellarSdk.rpc
          .assembleTransaction(tx, {
            _parsed: true,
            transactionData: new StellarSdk.SorobanDataBuilder(),
            minResourceFee: "0",
            result: { auth: [], retval: StellarSdk.nativeToScVal(undefined, { type: "void" }) },
          })
          .build()
      );
      signTransactionMock.mockResolvedValue({ error: null, signedTxXdr: unsigned.toXDR() });
      sorobanServerMock.sendTransaction.mockResolvedValue({
        status: "PENDING",
        hash: "pending123",
      });
      sorobanServerMock.getTransaction.mockResolvedValue({ status: "NOT_FOUND" });

      const promise = registerBuilderWithFreighter(USER, CONTRACT_ID, "alice");
      // 15 polls x 2s — flush the polling loop.
      await vi.advanceTimersByTimeAsync(31_000);
      await expect(promise).resolves.toEqual({
        hash: "pending123",
        returnValue: null,
        confirmed: false,
      });
      expect(sorobanServerMock.getTransaction).toHaveBeenCalledTimes(15);
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces Freighter signing rejections", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
      StellarSdk.rpc
        .assembleTransaction(tx, {
          _parsed: true,
          transactionData: new StellarSdk.SorobanDataBuilder(),
          minResourceFee: "0",
          result: { auth: [], retval: StellarSdk.nativeToScVal(undefined, { type: "void" }) },
        })
        .build()
    );
    signTransactionMock.mockResolvedValue({
      error: { message: "user declined" },
      signedTxXdr: null,
    });

    await expect(registerBuilderWithFreighter(USER, CONTRACT_ID, "alice")).rejects.toThrow(
      "user declined"
    );
    expect(sorobanServerMock.sendTransaction).not.toHaveBeenCalled();
  });

  it("rejects empty names without touching Freighter", async () => {
    await expect(registerBuilderWithFreighter(USER, CONTRACT_ID, "   ")).rejects.toThrow(
      "Enter a builder name to register."
    );
    expect(signTransactionMock).not.toHaveBeenCalled();
    expect(sorobanServerMock.getAccount).not.toHaveBeenCalled();
  });

  it("rejects names longer than 64 characters", async () => {
    await expect(
      registerBuilderWithFreighter(USER, CONTRACT_ID, "a".repeat(65))
    ).rejects.toThrow("64 characters or fewer");
    expect(sorobanServerMock.getAccount).not.toHaveBeenCalled();
  });

  it("allows a 64-character (multibyte-safe) name", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    const unsigned = buildRegisterTx(USER, "é".repeat(64));
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
      StellarSdk.rpc
        .assembleTransaction(tx, {
          _parsed: true,
          transactionData: new StellarSdk.SorobanDataBuilder(),
          minResourceFee: "0",
          result: { auth: [], retval: StellarSdk.nativeToScVal(undefined, { type: "void" }) },
        })
        .build()
    );
    signTransactionMock.mockResolvedValue({ error: null, signedTxXdr: unsigned.toXDR() });
    sorobanServerMock.sendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: "h",
    });
    sorobanServerMock.getTransaction.mockResolvedValue({ status: "SUCCESS" });

    const result = await registerBuilderWithFreighter(USER, CONTRACT_ID, "é".repeat(64));
    expect(result.confirmed).toBe(true);
  });

  it("rejects invalid public keys", async () => {
    await expect(
      registerBuilderWithFreighter("NOT_A_KEY", CONTRACT_ID, "alice")
    ).rejects.toThrow("Connect a valid Freighter address first.");
  });

  it("rejects invalid contract ids", async () => {
    await expect(
      registerBuilderWithFreighter(USER, "GAAAAWTF", "alice")
    ).rejects.toThrow("valid Soroban contract");
  });
});
