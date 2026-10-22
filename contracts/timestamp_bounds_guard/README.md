# Timestamp Bounds Guard

`timestamp-bounds-guard` is a self-contained, reusable Soroban smart contract and guard library primitive for validating ledger timestamps against configurable minimum and maximum bounds.

## Overview

The crate provides both:
1. **Pure validation functions**: A stateless helper `check_bounds(timestamp, min, max)` that can be imported directly into other contracts.
2. **Stateful guard contract**: An on-chain contract storing configurable bounds administered by an authorized admin address.

## Public Function Signatures

### Pure Helper

```rust
pub fn check_bounds(timestamp: u64, min: u64, max: u64) -> Result<(), GuardError>;
```

Validates that `min <= timestamp <= max`. Returns:
- `Ok(())` if within bounds.
- `Err(GuardError::InvalidBounds)` if `min > max`.
- `Err(GuardError::TimestampTooEarly)` if `timestamp < min`.
- `Err(GuardError::TimestampTooLate)` if `timestamp > max`.

### Contract API (`TimestampBoundsGuardContract`)

```rust
pub fn initialize(e: Env, admin: Address, min_timestamp: u64, max_timestamp: u64) -> Result<(), GuardError>;
pub fn set_bounds(e: Env, min_timestamp: u64, max_timestamp: u64) -> Result<(), GuardError>;
pub fn get_bounds(e: Env) -> Result<TimestampBounds, GuardError>;
pub fn get_admin(e: Env) -> Result<Address, GuardError>;
pub fn validate_timestamp(e: Env, timestamp: u64) -> Result<(), GuardError>;
pub fn validate_current_ledger(e: Env) -> Result<(), GuardError>;
```

## Types and Errors

### `TimestampBounds`

```rust
pub struct TimestampBounds {
    pub min_timestamp: u64,
    pub max_timestamp: u64,
}
```

### `GuardError`

- `1`: `NotInitialized` — The contract has not been initialized.
- `2`: `AlreadyInitialized` — Initialization was called more than once.
- `3`: `InvalidBounds` — `min_timestamp` is strictly greater than `max_timestamp`.
- `4`: `TimestampTooEarly` — Target timestamp is before `min_timestamp`.
- `5`: `TimestampTooLate` — Target timestamp is after `max_timestamp`.

## Building and Testing

Run test suite:
```sh
cargo test --manifest-path contracts/timestamp_bounds_guard/Cargo.toml
```

Run clippy linter:
```sh
cargo clippy --manifest-path contracts/timestamp_bounds_guard/Cargo.toml --all-targets -- -D warnings
```
