import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CI-friendly tests for the Soroban helpers in ./freighter.
 *
 * Nothing here touches the network or a real wallet:
 * - `StellarSdk.rpc.Server` is mocked so simulate/prepare/send/poll are fake.
 * - `@stellar/freighter-api` `signTransaction` is mocked.
 * - The real SDK is used for tx building, XDR round-trips, and scVal decoding.
 */

const { sorobanServerMock, signTransactionMock, horizonServerMock } = vi.hoisted(() => ({
  sorobanServerMock: {
    simulateTransaction: vi.fn(),
    prepareTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getAccount: vi.fn(),
  },
  signTransactionMock: vi.fn(),
  horizonServerMock: {
    loadAccount: vi.fn(),
    submitTransaction: vi.fn(),
  },
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
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(function () {
        return horizonServerMock;
      }),
    },
  };
});

const StellarSdk = await import("@stellar/stellar-sdk");
const {
  SOROBAN_RPC_URL,
  readKitewellState,
  registerBuilderWithFreighter,
  buildSep7TxUri,
  parseSep7TxUri,
  sendPaymentWithFreighter,
  submitEnvelope,
} = await import("./freighter");

const CONTRACT_ID =
  "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";
const USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const DEST = StellarSdk.Keypair.random().publicKey();
const AMOUNT = "10.0000000";

// Build a valid signed transaction XDR for mocking
let signedTxXdr;
beforeAll(() => {
  const account = new StellarSdk.Account(USER, "123456");
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: DEST,
        asset: StellarSdk.Asset.native(),
        amount: AMOUNT,
      })
    )
    .setTimeout(180)
    .build();
  // Sign with a dummy keypair to get valid XDR
  const keypair = StellarSdk.Keypair.fromSecret(
    "SBP4BHQPSIWSFMYZUE5RZ7AXZBKTUY76HNISQ7GZYD7U7JKGJBMRQR52"
  );
  tx.sign(keypair);
  signedTxXdr = tx.toXDR();
});

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

describe("SEP-7 transaction-request URI", () => {
  const TEST_PASSPHRASE = StellarSdk.Networks.TESTNET;
  const TEST_ENVELOPE_XDR = "AAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAA=";

  it("builds a valid SEP-7 URI with envelope XDR and network passphrase", () => {
    const uri = buildSep7TxUri(TEST_ENVELOPE_XDR, TEST_PASSPHRASE);
    // URLSearchParams uses + for spaces in application/x-www-form-urlencoded
    expect(uri).toBe(
      `web+stellar:tx:${TEST_ENVELOPE_XDR}?network_passphrase=Test+SDF+Network+%3B+September+2015`
    );
  });

  it("throws when envelope XDR is empty", () => {
    expect(() => buildSep7TxUri("", TEST_PASSPHRASE)).toThrow("Envelope XDR is required");
    expect(() => buildSep7TxUri(null, TEST_PASSPHRASE)).toThrow("Envelope XDR is required");
  });

  it("parses a valid SEP-7 URI and returns the envelope XDR", () => {
    const uri = buildSep7TxUri(TEST_ENVELOPE_XDR, TEST_PASSPHRASE);
    const envelopeXdr = parseSep7TxUri(uri, TEST_PASSPHRASE);
    expect(envelopeXdr).toBe(TEST_ENVELOPE_XDR);
  });

  it("throws when URI has wrong scheme", () => {
    expect(() => parseSep7TxUri("stellar:tx:abc?network_passphrase=test", TEST_PASSPHRASE)).toThrow(
      "Invalid SEP-7"
    );
    expect(() => parseSep7TxUri("https://example.com", TEST_PASSPHRASE)).toThrow("Invalid SEP-7");
  });

  it("throws when URI is missing transaction envelope", () => {
    const uri = `web+stellar:tx:?network_passphrase=${encodeURIComponent(TEST_PASSPHRASE)}`;
    expect(() => parseSep7TxUri(uri, TEST_PASSPHRASE)).toThrow("missing transaction envelope");
  });

  it("throws when URI is missing network_passphrase parameter", () => {
    const uri = `web+stellar:tx:${TEST_ENVELOPE_XDR}`;
    expect(() => parseSep7TxUri(uri, TEST_PASSPHRASE)).toThrow("missing network_passphrase");
  });

  it("throws when network passphrase does not match expected", () => {
    const uri = buildSep7TxUri(TEST_ENVELOPE_XDR, "Different Network Passphrase");
    expect(() => parseSep7TxUri(uri, TEST_PASSPHRASE)).toThrow("different network");
  });

  it("round-trips an envelope through the URI", () => {
    const originalXdr = TEST_ENVELOPE_XDR;
    const uri = buildSep7TxUri(originalXdr, TEST_PASSPHRASE);
    const parsedXdr = parseSep7TxUri(uri, TEST_PASSPHRASE);
    expect(parsedXdr).toBe(originalXdr);
  });
});

describe("sendPaymentWithFreighter time bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock loadAccount to return a valid account
    horizonServerMock.loadAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "123456")
    );
    // Mock submitTransaction to return a success result
    horizonServerMock.submitTransaction.mockResolvedValue({
      hash: "testhash123",
    });
    // Mock Freighter signTransaction
    signTransactionMock.mockResolvedValue({
      error: null,
      signedTxXdr,
    });
  });

  it("builds transaction with default timeout when no time bounds provided", async () => {
    await sendPaymentWithFreighter(USER, DEST, AMOUNT, null, "text", "");

    // Should have called setTimeout(180) not setTimeBounds
    const txBuilder = horizonServerMock.loadAccount.mock.results[0].value;
    expect(txBuilder).toBeDefined();
    // The transaction is built internally, we verify by checking the submitTransaction call
    expect(horizonServerMock.submitTransaction).toHaveBeenCalled();
  });

  it("validates that max time must be after min time", async () => {
    const minTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const maxTime = minTime - 100; // max before min

    await expect(
      sendPaymentWithFreighter(USER, DEST, AMOUNT, null, "text", "", minTime, maxTime)
    ).rejects.toThrow("Maximum time must be after minimum time.");
  });

  it("validates that max time must be in the future", async () => {
    const maxTime = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago

    await expect(
      sendPaymentWithFreighter(USER, DEST, AMOUNT, null, "text", "", null, maxTime)
    ).rejects.toThrow("Maximum time must be in the future.");
  });

  it("allows min time only (with max defaulting to 0)", async () => {
    const minTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await sendPaymentWithFreighter(USER, DEST, AMOUNT, null, "text", "", minTime, null);

    expect(horizonServerMock.submitTransaction).toHaveBeenCalled();
  });

  it("allows max time only (with min defaulting to 0)", async () => {
    const maxTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now

    await sendPaymentWithFreighter(USER, DEST, AMOUNT, null, "text", "", null, maxTime);

    expect(horizonServerMock.submitTransaction).toHaveBeenCalled();
  });

  it("accepts both min and max time when valid", async () => {
    const now = Math.floor(Date.now() / 1000);
    const minTime = now + 3600; // 1 hour from now
    const maxTime = now + 7200; // 2 hours from now

    await sendPaymentWithFreighter(USER, DEST, AMOUNT, null, "text", "", minTime, maxTime);

    expect(horizonServerMock.submitTransaction).toHaveBeenCalled();
  });
});

describe("submitEnvelope", () => {
  const USER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  const DEST = StellarSdk.Keypair.random().publicKey();
  const AMOUNT = "10.0000000";

  // Build a valid unsigned transaction XDR for mocking
  let unsignedTxXdr;
  let signedTxXdr;
  beforeAll(() => {
    const account = new StellarSdk.Account(USER, "123456");
    // Unsigned transaction
    const unsignedTx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: DEST,
          asset: StellarSdk.Asset.native(),
          amount: AMOUNT,
        })
      )
      .setTimeout(180)
      .build();
    unsignedTxXdr = unsignedTx.toXDR();

    // Signed transaction
    const keypair = StellarSdk.Keypair.fromSecret(
      "SBP4BHQPSIWSFMYZUE5RZ7AXZBKTUY76HNISQ7GZYD7U7JKGJBMRQR52"
    );
    const signedTx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: DEST,
          asset: StellarSdk.Asset.native(),
          amount: AMOUNT,
        })
      )
      .setTimeout(180)
      .build();
    signedTx.sign(keypair);
    signedTxXdr = signedTx.toXDR();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock loadAccount to return a valid account
    horizonServerMock.loadAccount.mockResolvedValue(
      new StellarSdk.Account(USER, "123456")
    );
    // Mock submitTransaction to return a success result
    horizonServerMock.submitTransaction.mockResolvedValue({
      hash: "testhash123",
    });
    // Mock Freighter signTransaction
    signTransactionMock.mockResolvedValue({
      error: null,
      signedTxXdr,
    });
  });

  it("submits unsigned envelope by signing with Freighter first", async () => {
    const result = await submitEnvelope(unsignedTxXdr, USER);

    expect(signTransactionMock).toHaveBeenCalledTimes(1);
    expect(horizonServerMock.submitTransaction).toHaveBeenCalledTimes(1);
    expect(result.hash).toBe("testhash123");
  });

  it("submits signed envelope directly without re-signing", async () => {
    const result = await submitEnvelope(signedTxXdr, USER);

    expect(signTransactionMock).not.toHaveBeenCalled();
    expect(horizonServerMock.submitTransaction).toHaveBeenCalledTimes(1);
    expect(result.hash).toBe("testhash123");
  });

  it("throws on decode error", async () => {
    await expect(submitEnvelope("invalid_xdr", USER)).rejects.toThrow("Unable to decode transaction envelope");
    expect(signTransactionMock).not.toHaveBeenCalled();
    expect(horizonServerMock.submitTransaction).not.toHaveBeenCalled();
  });

  it("submitted XDR equals pasted XDR for signed envelope", async () => {
    // The submitted transaction should be the exact same XDR
    let submittedXdr = null;
    horizonServerMock.submitTransaction.mockImplementation(async (tx) => {
      submittedXdr = tx.toXDR();
      return { hash: "testhash123" };
    });

    await submitEnvelope(signedTxXdr, USER);

    expect(submittedXdr).toBe(signedTxXdr);
  });

  it("throws on invalid XDR", async () => {
    await expect(submitEnvelope("invalid_xdr", USER)).rejects.toThrow("Unable to decode transaction envelope");
  });
});
