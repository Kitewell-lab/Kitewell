# Rename Cooldown Enforcer (`rename_cooldown`)

A standalone Soroban smart contract primitive that enforces a minimum ledger-sequence cooldown between two renames of the same registered entry (e.g. builder profile, domain, or handle).

---

## Overview & Concept

In on-chain identity and registry systems, allowing users to rename their registered entries without restrictions can lead to front-running, squatting, or rapid churn. The `rename_cooldown` contract acts as a pluggable, independent guard:
- It tracks the ledger sequence at which each registered entry (`Address`) was last renamed.
- It enforces a configurable minimum cooldown duration (in ledger units).
- Entries can only be renamed if the current ledger sequence satisfies:
  $$\text{current\_ledger} \ge \text{last\_rename\_ledger} + \text{effective\_cooldown}$$
- Admin controls allow dynamic adjustment of default cooldowns, custom per-entry overrides, and emergency cooldown resets.

---

## Public Functions

### Administrative Management

- `initialize(e: Env, admin: Address, min_cooldown_ledgers: u32) -> Result<(), CooldownError>`
  Initializes the contract with an administrator and default cooldown duration. Fails with `AlreadyInitialized` if already called or `ZeroCooldown` if cooldown is zero.
- `get_admin(e: Env) -> Result<Address, CooldownError>`
  Returns the current administrator address.
- `set_admin(e: Env, new_admin: Address) -> Result<(), CooldownError>`
  Transfers contract ownership to a new administrator. Requires current administrator authorization.
- `get_cooldown(e: Env) -> Result<u32, CooldownError>`
  Returns the default global cooldown duration in ledgers.
- `set_cooldown(e: Env, new_cooldown: u32) -> Result<(), CooldownError>`
  Updates the global cooldown duration in ledgers. Requires admin authorization.
- `set_entry_cooldown(e: Env, entry: Address, custom_cooldown: u32) -> Result<(), CooldownError>`
  Sets a custom cooldown duration specific to a given entry. Requires admin authorization.
- `clear_entry_cooldown(e: Env, entry: Address) -> Result<(), CooldownError>`
  Clears any custom cooldown override for the entry, reverting to the default cooldown. Requires admin authorization.
- `reset_cooldown(e: Env, entry: Address) -> Result<(), CooldownError>`
  Performs an administrative override that immediately removes an entry's active cooldown.

### Cooldown Queries & Verification

- `get_effective_cooldown(e: Env, entry: Address) -> Result<u32, CooldownError>`
  Returns the active cooldown for the specified entry (custom if configured, otherwise default).
- `get_last_rename_ledger(e: Env, entry: Address) -> Option<u32>`
  Returns the ledger sequence of the last recorded rename, or `None` if the entry has never been renamed.
- `get_remaining_cooldown(e: Env, entry: Address) -> Result<u32, CooldownError>`
  Computes the number of ledgers remaining before the entry is eligible for renaming (`0` if eligible).
- `can_rename(e: Env, entry: Address) -> Result<bool, CooldownError>`
  Returns `true` if the cooldown has elapsed or the entry was never renamed.
- `assert_can_rename(e: Env, entry: Address) -> Result<(), CooldownError>`
  Returns `Ok(())` if rename is permitted, or `Err(CooldownError::CooldownActive)` if still within cooldown.
- `get_rename_count(e: Env, entry: Address) -> u32`
  Returns the total number of renames recorded for the entry.

### Rename Enforcement

- `record_rename(e: Env, caller: Address, entry: Address) -> Result<u32, CooldownError>`
  Records a rename at the current ledger sequence:
  1. Verifies caller authorization (`caller == entry` or `caller == admin`).
  2. Asserts that the cooldown duration has passed.
  3. Updates the entry's last rename ledger to `env.ledger().sequence()`.
  4. Increments the rename count.
  5. Publishes a `RenameRecordedEvent`.
  6. Returns the current ledger sequence.

---

## Pure Helper Utilities

For integration with off-chain clients or zero-host logic:
- `calculate_remaining_ledgers(current_ledger: u32, last_rename_ledger: Option<u32>, cooldown_ledgers: u32) -> u32`
- `is_rename_allowed(current_ledger: u32, last_rename_ledger: Option<u32>, cooldown_ledgers: u32) -> bool`

---

## Events

The contract emits the following typed events via `soroban_sdk::contractevent`:
- `InitializedEvent`: `[rename_cd, init]` — admin and initial cooldown.
- `AdminTransferredEvent`: `[rename_cd, admin_xfer]` — previous and new admin.
- `CooldownUpdatedEvent`: `[rename_cd, cd_update]` — old and new default cooldown.
- `RenameRecordedEvent`: `[rename_cd, recorded]` — entry, caller, ledger, and next allowed ledger.
- `CooldownResetEvent`: `[rename_cd, reset]` — entry and admin.
- `EntryCooldownSetEvent`: `[rename_cd, entry_cd]` — entry and custom cooldown.
- `EntryCooldownClearedEvent`: `[rename_cd, entry_clr]` — entry and admin.

---

## Building and Testing

```bash
# Run unit and integration tests
cargo test --manifest-path contracts/rename_cooldown/Cargo.toml

# Run strict clippy analysis
cargo clippy --manifest-path contracts/rename_cooldown/Cargo.toml --all-targets -- -D warnings
```
