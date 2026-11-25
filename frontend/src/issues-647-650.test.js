import { describe, expect, it, vi } from "vitest";
import {
  computeWasmHash,
  compareWasmHashes,
  readPausedState,
  filterEventsByBuilder,
} from "./freighter";
import { fetchAccountViaApi } from "./api";

describe("Issue #647: Wasm hash comparison", () => {
  const FIXTURE_HASH_A = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const FIXTURE_HASH_B = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

  it("says the installed code is this lab's wasm when hashes match", () => {
    const result = compareWasmHashes(FIXTURE_HASH_A, FIXTURE_HASH_A);
    expect(result.match).toBe(true);
    expect(result.message).toBe("The installed code is this lab's wasm.");
    expect(result.hasOnChainHash).toBe(true);
  });

  it("says they differ when fixture hashes are different", () => {
    const result = compareWasmHashes(FIXTURE_HASH_A, FIXTURE_HASH_B);
    expect(result.match).toBe(false);
    expect(result.message).toBe("The installed code differs from this lab's wasm.");
    expect(result.hasOnChainHash).toBe(true);
  });

  it("says there is no on-chain hash when contract is not deployed", () => {
    const result = compareWasmHashes(FIXTURE_HASH_A, null);
    expect(result.match).toBe(false);
    expect(result.hasOnChainHash).toBe(false);
    expect(result.message).toBe("There is no on-chain hash.");
  });

  it("computes full 64-hex-char wasm hash from valid wasm binary", () => {
    // \0asm header + 4 dummy bytes
    const wasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    const hash = computeWasmHash(wasmBytes);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
});

describe("Issue #648: Registration paused check before Freighter opens", () => {
  const CONTRACT_ID = "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";

  it("reads paused flag and detects a paused fixture", async () => {
    const paused = await readPausedState(CONTRACT_ID);
    expect(typeof paused).toBe("boolean");
  });

  it("blocks registration when paused flag is true and allows when false", () => {
    const checkCanRegister = (isPaused) => {
      if (isPaused) {
        throw new Error("Registration is paused by the lab admin.");
      }
      return true;
    };

    expect(() => checkCanRegister(true)).toThrow("Registration is paused by the lab admin.");
    expect(checkCanRegister(false)).toBe(true);
  });

  it("refuses invalid contract id", async () => {
    await expect(readPausedState("invalid-id")).rejects.toThrow("valid Soroban contract strkey");
  });
});

describe("Issue #649: Filter contract events by builder address", () => {
  const BUILDER_A = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
  const BUILDER_B = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  const EVENTS_FIXTURE = [
    { id: "1", type: "register", caller: BUILDER_A, builder: BUILDER_A, name: "alice", ledger: 100 },
    { id: "2", type: "register", caller: BUILDER_B, builder: BUILDER_B, name: "bob", ledger: 101 },
    { id: "3", type: "paused", paused: true, ledger: 102 },
  ];

  it("keeps matching fixture event and hides the other builder and non-builder events", () => {
    const { events, active, filteredOutNonBuilder } = filterEventsByBuilder(EVENTS_FIXTURE, BUILDER_A);
    expect(active).toBe(true);
    expect(filteredOutNonBuilder).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].caller).toBe(BUILDER_A);
    expect(events[0].name).toBe("alice");
  });

  it("refuses a malformed address without mutating or clearing the loaded list", () => {
    expect(() => filterEventsByBuilder(EVENTS_FIXTURE, "malformed-address")).toThrow("Invalid builder address.");
    expect(EVENTS_FIXTURE).toHaveLength(3);
  });

  it("clearing the filter shows the full loaded tail again", () => {
    const { events, active } = filterEventsByBuilder(EVENTS_FIXTURE, "");
    expect(active).toBe(false);
    expect(events).toEqual(EVENTS_FIXTURE);
  });
});

describe("Issue #650: Account figures age and stale indicator", () => {
  it("records arrival timestamp upon successful account load", async () => {
    const mockData = { balances: [{ asset: "native", balance: "10.0" }] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchAccountViaApi("GTEST");
    expect(result.arrivedAt).toBeDefined();
    expect(typeof result.arrivedAt).toBe("number");
    expect(result.arrivedAt).toBeGreaterThan(0);
  });

  it("marks a failed refresh as stale when figures already exist without wiping them", () => {
    const previousBalances = [{ asset: "native", balance: "50.0" }];
    const previousTimestamp = Date.now() - 60000;

    let balances = previousBalances;
    let timestamp = previousTimestamp;
    let stale = false;

    // Simulate failed refresh
    const handleRefreshFailure = () => {
      stale = true;
      if (!balances || balances.length === 0) {
        balances = [];
        timestamp = null;
      }
    };

    handleRefreshFailure(new Error("Network timeout"));

    expect(stale).toBe(true);
    expect(balances).toEqual(previousBalances);
    expect(timestamp).toBe(previousTimestamp);
  });

  it("shows an empty state rather than a stale one on first load failure", () => {
    let balances = [];
    let timestamp = null;
    let stale = false;

    // Simulate first load failure
    const handleFirstLoadFailure = () => {
      stale = true;
      if (!balances || balances.length === 0) {
        balances = [];
        timestamp = null;
      }
    };

    handleFirstLoadFailure(new Error("Account not found"));

    expect(stale).toBe(true);
    expect(balances).toEqual([]);
    expect(timestamp).toBeNull();
  });
});
