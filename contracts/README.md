# Kitewell — Soroban contract

On-chain builder check-in for the Kitewell Testnet experience.

## Methods

| Method | Description |
|--------|-------------|
| `init(admin)` | One-time initialiser; stores the admin address |
| `get_admin()` | Returns the current admin, if initialised |
| `propose_admin(admin, new_admin)` | Current admin proposes a successor |
| `accept_admin(new_admin)` | Pending admin accepts and takes over |
| `set_paused(admin, paused)` | Admin-only pause / unpause toggle |
| `lab_name()` | Returns `"Kitewell"` |
| `builder_count()` | Number of unique registered builders |
| `register(caller, name)` | Auth-gated check-in; stores nickname |
| `get_builder(address)` | Lookup nickname |

## Behavior notes

**Auth gate.** `register(caller, name)` calls `caller.require_auth()` before it
touches storage, so every successful check-in must be signed by the `caller`
address passed in. The read methods (`lab_name`, `builder_count`,
`get_builder`, `get_admin`) are permissionless and need no auth entry. The
admin-bearing methods (`init`, `set_paused`, `propose_admin`, `accept_admin`)
are described below.

**Count on first register.** `builder_count()` is incremented only the first
time a given `caller` is seen: `register` checks whether the persistent
`(KITEWELL, caller)` entry already exists, writes the nickname, and bumps the
instance counter only when the entry was missing. Calling `register` again for
the same address overwrites the stored name without changing the count.

**TTL extend on write.** `register` is the only method that extends storage
TTL. When a new builder is added it extends the instance storage TTL with
`extend_ttl(1000, 5000)` alongside the counter update, and it always extends the
persistent `(KITEWELL, caller)` entry TTL with `extend_ttl(1000, 5000)` after
writing the name. Reads never extend TTL, so a long-idle registry can still
require a write to keep entries live.

## Admin transfer (two-step)

`init(admin)` stores the admin once and cannot be called again. To hand control
to a new address without a single irreversible call, use the two-step flow:

1. **Propose.** The current admin calls
   `propose_admin(admin, new_admin)`. It requires `admin.require_auth()` and
   checks the signer against the stored `ADMIN`; on mismatch it returns
   `NotAdmin` (3). On success `new_admin` is recorded as *pending* and the
   current admin keeps full control. Proposing again simply overwrites the
   pending address.
2. **Accept.** The pending address calls `accept_admin(new_admin)`. It requires
   `new_admin.require_auth()` and must match the pending address; a different
   signer returns `NotAdmin` (3). If nothing is pending it returns the new
   `NoPendingAdmin` (5). On success `new_admin` becomes the live `ADMIN` and the
   pending slot is cleared.

Because control only moves on the second step, a typo in the proposed address
leaves the current admin in charge, and the old admin loses admin-only rights
(such as `set_paused`) the moment the transfer completes. `get_admin()` reads
the current admin (or `None` before `init`). Multisig admins and timelocks are
out of scope.

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
