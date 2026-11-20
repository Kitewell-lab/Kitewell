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
  installKitewellContract,
  initializeKitewellContract,
  deployKitewellContract,
} = await import("./freighter");

const CONTRACT_ID =
  "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";
const USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
const CONTRACT_HASH = StellarSdk.hash(Buffer.from("kitewell-contract"));
const DEPLOYED_ID = StellarSdk.Address.contract(CONTRACT_HASH).toString();

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

/** prepareTransaction's assemble step, with a fixed resource fee. */
function assemblePrepared(tx) {
  return StellarSdk.rpc
    .assembleTransaction(tx, {
      _parsed: true,
      transactionData: new StellarSdk.SorobanDataBuilder().setResourceFee("4321"),
      minResourceFee: "123",
      result: {
        auth: [],
        retval: StellarSdk.nativeToScVal(undefined, { type: "void" }),
      },
    })
    .build();
}

/** Successful create-contract result: the new contract hash in the first op. */
function installResultXdr(contractHash = CONTRACT_HASH) {
  const ok = StellarSdk.xdr.OperationResult.opInner(
    StellarSdk.xdr.OperationResultTr.invokeHostFunction(
      StellarSdk.xdr.InvokeHostFunctionResult.invokeHostFunctionSuccess(contractHash)
    )
  );
  return new StellarSdk.xdr.TransactionResult({
    feeCharged: StellarSdk.xdr.Int64.fromString("100"),
    result: StellarSdk.xdr.TransactionResultResult.txSuccess([ok]),
    ext: new StellarSdk.xdr.TransactionResultExt(0),
  });
}

/** Stub the common prepare → sign → submit → poll pipeline for one invoke. */
function stubSorobanSubmit(sendResult, successStatus = { status: "SUCCESS" }) {
  sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
    assemblePrepared(tx)
  );
  signTransactionMock.mockImplementation(async (xdr) => ({
    error: null,
    signedTxXdr: xdr,
  }));
  sorobanServerMock.sendTransaction.mockResolvedValue(sendResult);
  sorobanServerMock.getTransaction.mockResolvedValue(successStatus);
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

describe("installKitewellContract", () => {
  it("uploads the Wasm, then creates the contract and reads its id from the result", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    const preparedTxs = [];
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) => {
      preparedTxs.push(tx);
      return assemblePrepared(tx);
    });
    signTransactionMock.mockImplementation(async (xdr) => ({
      error: null,
      signedTxXdr: xdr,
    }));
    sorobanServerMock.sendTransaction
      .mockResolvedValueOnce({ status: "PENDING", hash: "upload-hash" })
      .mockResolvedValueOnce({ status: "PENDING", hash: "create-hash" });
    sorobanServerMock.getTransaction
      .mockResolvedValueOnce({ status: "SUCCESS" })
      .mockResolvedValueOnce({
        status: "SUCCESS",
        resultXdr: installResultXdr(),
      });

    const result = await installKitewellContract(USER, WASM, {
      salt: new Uint8Array(32),
    });

    expect(result).toEqual({
      contractId: DEPLOYED_ID,
      hash: "create-hash",
      uploadHash: "upload-hash",
      confirmed: true,
    });
    expect(
      preparedTxs.map((tx) => tx.operations.map((op) => op.func.switch().name))
    ).toEqual([
      ["hostFunctionTypeUploadContractWasm"],
      ["hostFunctionTypeCreateContractV2"],
    ]);
    expect(Buffer.from(preparedTxs[0].operations[0].func.wasm())).toEqual(
      Buffer.from(WASM)
    );
    const create = preparedTxs[1].operations[0].func.createContractV2();
    expect(Buffer.from(create.executable().wasmHash())).toEqual(
      Buffer.from(StellarSdk.hash(WASM))
    );
    expect(
      StellarSdk.Address.fromScAddress(
        create.contractIdPreimage().fromAddress().address()
      ).toString()
    ).toBe(USER);
    expect(signTransactionMock).toHaveBeenCalledTimes(2);
    expect(sorobanServerMock.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it("throws without a contract id when the create step is rejected", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) =>
      assemblePrepared(tx)
    );
    signTransactionMock.mockImplementation(async (xdr) => ({
      error: null,
      signedTxXdr: xdr,
    }));
    sorobanServerMock.sendTransaction
      .mockResolvedValueOnce({ status: "PENDING", hash: "upload-hash" })
      .mockResolvedValueOnce({ status: "ERROR", hash: "bad-create" });
    sorobanServerMock.getTransaction.mockResolvedValue({ status: "SUCCESS" });

    await expect(installKitewellContract(USER, WASM)).rejects.toThrow(
      "Contract create rejected by the network. Tx hash: bad-create"
    );
    expect(signTransactionMock).toHaveBeenCalledTimes(2);
  });

  it("stops after a failed upload and never creates a contract", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    stubSorobanSubmit({ status: "ERROR", hash: "bad-upload" });

    await expect(installKitewellContract(USER, WASM)).rejects.toThrow(
      "Wasm upload rejected by the network. Tx hash: bad-upload"
    );
    expect(signTransactionMock).toHaveBeenCalledTimes(1);
    expect(sorobanServerMock.sendTransaction).toHaveBeenCalledTimes(1);
    expect(sorobanServerMock.getTransaction).not.toHaveBeenCalled();
  });

  it("rejects a non-Wasm file before touching RPC", async () => {
    await expect(
      installKitewellContract(USER, new Uint8Array([1, 2, 3, 4]))
    ).rejects.toThrow("Not a Wasm binary");
    expect(sorobanServerMock.getAccount).not.toHaveBeenCalled();
  });
});

describe("initializeKitewellContract", () => {
  it("calls init once with the connected account as admin", async () => {
    sorobanServerMock.getAccount.mockResolvedValue(rpcAccountFixture(USER));
    let prepared;
    stubSorobanSubmit({ status: "PENDING", hash: "init-hash" }, { status: "SUCCESS" });
    sorobanServerMock.prepareTransaction.mockImplementation(async (tx) => {
      prepared = tx;
      return assemblePrepared(tx);
    });

    const result = await initializeKitewellContract(USER, CONTRACT_ID);

    expect(result).toEqual({ hash: "init-hash", confirmed: true });
    expect(prepared.operations).toHaveLength(1);
    const invoke = prepared.operations[0].func.value();
    expect(invoke.functionName().toString()).toBe("init");
    expect(invoke.args()).toHaveLength(1);
    expect(StellarSdk.scValToNative(invoke.args()[0])).toBe(USER);
    expect(signTransactionMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid contract id before building a tx", async () => {
    await expect(initializeKitewellContract(USER, "GAAAAWTF")).rejects.toThrow(
      "valid Soroban contract"
    );
    expect(sorobanServerMock.getAccount).not.toHaveBeenCalled();
  });
});

describe("deployKitewellContract", () => {
  it("stubs install and init and asserts the order", async () => {
    const calls = [];
    const install = vi.fn(async (publicKey, wasm) => {
      calls.push("install");
      expect(publicKey).toBe(USER);
      expect(wasm).toBe(WASM);
      return {
        contractId: DEPLOYED_ID,
        hash: "install-hash",
        confirmed: true,
      };
    });
    const init = vi.fn(async () => {
      calls.push("init");
      return { hash: "init-hash", confirmed: true };
    });

    const result = await deployKitewellContract(USER, WASM, { install, init });

    expect(calls).toEqual(["install", "init"]);
    expect(install).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(USER, DEPLOYED_ID);
    expect(result).toEqual({
      contractId: DEPLOYED_ID,
      installHash: "install-hash",
      initHash: "init-hash",
      confirmed: true,
    });
  });

  it("does not call init when the install fails, and shows no id", async () => {
    const init = vi.fn();
    const install = vi.fn(async () => {
      throw new Error("Contract install rejected by the network. Tx hash: bad");
    });

    await expect(
      deployKitewellContract(USER, WASM, { install, init })
    ).rejects.toThrow("Contract install rejected");
    expect(install).toHaveBeenCalledTimes(1);
    expect(init).not.toHaveBeenCalled();
  });

  it("rejects a bad Wasm file before either phase runs", async () => {
    const install = vi.fn();
    const init = vi.fn();
    await expect(
      deployKitewellContract(USER, "not bytes", { install, init })
    ).rejects.toThrow("Choose the built kitewell.wasm");
    expect(install).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
  });
});
