# Pausable Flag Primitive

`pausable-flag` is a standalone, reusable Soroban smart contract primitive for implementing emergency stop / pause mechanisms decoupled from any specific contract.

## Overview

The primitive manages a persistent paused boolean flag guarded by admin authorization:
- `initialize(e, admin)` sets the initial administrator with `paused = false`.
- `set_paused(e, paused)` toggles paused status with admin authorization and emits a contract event.
- `is_paused(e)` checks the current state.
- `assert_not_paused(e)` verifies that the contract is active, returning an error if paused.
- `set_admin(e, new_admin)` permits transferring administrative control.

## Public Function Signatures

```rust
pub fn initialize(e: Env, admin: Address) -> Result<(), PausableError>;
pub fn set_paused(e: Env, paused: bool) -> Result<(), PausableError>;
pub fn is_paused(e: Env) -> Result<bool, PausableError>;
pub fn get_admin(e: Env) -> Result<Address, PausableError>;
pub fn assert_not_paused(e: Env) -> Result<(), PausableError>;
pub fn set_admin(e: Env, new_admin: Address) -> Result<(), PausableError>;
```

## Error Codes (`PausableError`)

- `1`: `NotInitialized` — Primitive has not yet been initialized.
- `2`: `AlreadyInitialized` — Initialization was called more than once.
- `3`: `ContractPaused` — Assert failed because contract is currently paused.

## Building and Testing

Run test suite:
```sh
cargo test --manifest-path contracts/pausable_flag/Cargo.toml
```

Run clippy linter:
```sh
cargo clippy --manifest-path contracts/pausable_flag/Cargo.toml --all-targets -- -D warnings
```
