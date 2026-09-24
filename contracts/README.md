# Kitewell — Soroban contract

On-chain builder check-in for the Kitewell Testnet experience.

## Methods

| Method | Description |
|--------|-------------|
| `lab_name()` | Returns `"Kitewell"` |
| `builder_count()` | Number of unique registered builders |
| `register(caller, name)` | Auth-gated check-in; stores nickname |
| `get_builder(address)` | Lookup nickname |

## Build

Requires Rust. Unit tests:

```bash
cargo test --manifest-path contracts/kitewell/Cargo.toml
```

Release WASM (needs [Stellar CLI](https://developers.stellar.org/docs/tools/cli) **v25.2.0+**):

```bash
stellar contract build --manifest-path contracts/kitewell/Cargo.toml
```

> `cargo build --target wasm32v1-none` alone is not enough on soroban-sdk 28 — use `stellar contract build`.

## Deploy (Testnet)

With the [Stellar CLI](https://developers.stellar.org/docs/tools/cli):

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/kitewell.wasm \
  --source-account <IDENTITY> \
  --network testnet
```

Set the contract id on the backend:

```bash
export KITEWELL_CONTRACT_ID=C...
```

## Register from the Lab tab

After deploy, the frontend Lab tab reads `lab_name()`, `builder_count()`, and
`get_builder(viewer)` via Soroban RPC, and lets Freighter sign a
`register(caller, name)` invoke:

1. Start the backend (`npm run dev:backend`) so `/api/network` serves
   `KITEWELL_CONTRACT_ID`, then open the Lab tab.
2. Enter a builder name (≤ 64 chars) and hit **Sign & register**. Freighter
   pops up to sign the assembled Soroban transaction.
3. The UI polls for on-chain confirmation, then refreshes `builder_count` and
   shows your nickname from `get_builder`, with an explorer link for the tx.

Reads and registration use the public Testnet RPC
(`https://soroban-testnet.stellar.org`, env-overridable via
`SOROBAN_RPC_URL` on both backend and frontend).
