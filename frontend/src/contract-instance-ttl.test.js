import { describe, expect, it, vi } from "vitest";
import {
  ARCHIVED_INSTANCE_MESSAGE,
  contractInstanceLedgerKey,
  describeInstanceTtl,
  readContractInstanceTtl,
} from "./contractInstanceTtl";

/**
 * Issue #667: the panel reads the instance TTL and shows the ledgers remaining
 * beside the latest ledger. Reading never extends anything.
 */

const CONTRACT_ID =
  "CCWLNS5HECRJ2GM3Q6JZZDV334ZXYO6EKZLFPLQRXO6SUDAKMS4U3E3X";

function rpcServerStub({ latestLedger = 1000, entries = [] } = {}) {
  return {
    getLatestLedger: vi.fn().mockResolvedValue({ sequence: latestLedger }),
    getLedgerEntries: vi.fn().mockResolvedValue({ entries }),
    prepareTransaction: vi.fn(),
    sendTransaction: vi.fn(),
  };
}

describe("contractInstanceLedgerKey", () => {
  it("asks for the persistent contract-instance entry", () => {
    const key = contractInstanceLedgerKey(CONTRACT_ID);

    expect(key.switch().name).toBe("contractData");
    expect(key.contractData().key().switch().name).toBe(
      "scvLedgerKeyContractInstance"
    );
    expect(key.contractData().durability().name).toBe("persistent");
  });
});

describe("describeInstanceTtl", () => {
  it("reports the ledgers remaining from a fixture entry and the latest ledger", () => {
    const result = describeInstanceTtl({
      latestLedger: 1200,
      liveUntilLedgerSeq: 1240,
    });

    expect(result).toEqual({
      latestLedger: 1200,
      liveUntilLedgerSeq: 1240,
      ledgersRemaining: 40,
      archived: false,
      message: null,
    });
  });

  it("never reports a negative remaining count", () => {
    expect(
      describeInstanceTtl({ latestLedger: 1200, liveUntilLedgerSeq: 1100 })
        .ledgersRemaining
    ).toBe(0);
  });

  it("says there is no TTL to show when the entry is archived", () => {
    const result = describeInstanceTtl({
      latestLedger: 1200,
      liveUntilLedgerSeq: null,
    });

    expect(result.archived).toBe(true);
    expect(result.liveUntilLedgerSeq).toBeNull();
    expect(result.ledgersRemaining).toBeNull();
    expect(result.message).toBe(ARCHIVED_INSTANCE_MESSAGE);
  });
});

describe("readContractInstanceTtl", () => {
  it("shows the remaining ledgers from a fixture entry", async () => {
    const server = rpcServerStub({
      latestLedger: 1200,
      entries: [{ liveUntilLedgerSeq: 1240 }],
    });

    const result = await readContractInstanceTtl(CONTRACT_ID, { server });

    expect(server.getLatestLedger).toHaveBeenCalledTimes(1);
    expect(server.getLedgerEntries).toHaveBeenCalledTimes(1);
    expect(result.latestLedger).toBe(1200);
    expect(result.liveUntilLedgerSeq).toBe(1240);
    expect(result.ledgersRemaining).toBe(40);
  });

  it("does not extend anything: it never prepares or sends a transaction", async () => {
    const server = rpcServerStub({ entries: [{ liveUntilLedgerSeq: 1240 }] });

    await readContractInstanceTtl(CONTRACT_ID, { server });

    expect(server.prepareTransaction).not.toHaveBeenCalled();
    expect(server.sendTransaction).not.toHaveBeenCalled();
  });

  it("says an archived instance has no TTL to show", async () => {
    const server = rpcServerStub({ latestLedger: 1200, entries: [] });

    const result = await readContractInstanceTtl(CONTRACT_ID, { server });

    expect(result.archived).toBe(true);
    expect(result.message).toBe(ARCHIVED_INSTANCE_MESSAGE);
    expect(result.ledgersRemaining).toBeNull();
  });

  it("refuses an invalid contract id before asking the RPC", async () => {
    const server = rpcServerStub();

    await expect(readContractInstanceTtl("not-a-contract", { server })).rejects.toThrow(
      /valid Soroban contract strkey/
    );
    expect(server.getLatestLedger).not.toHaveBeenCalled();
  });
});
