# Generic Per-Key Event Counter

`event-counter` is a standalone, reusable Soroban smart contract primitive that maintains per-key numeric counters and emits a contract event every time a counter increments.

## Overview

The primitive allows tracking counts for arbitrary keys (represented as `Symbol`):
- `increment(e, key)` increments the counter for `key` by 1.
- `increment_by(e, key, amount)` increments the counter for `key` by `amount`.
- `get_count(e, key)` retrieves the current counter for `key` (defaulting to 0).
- `get_total_count(e)` returns the cumulative total of all increments across all keys.
- `has_key(e, key)` checks if a key has been recorded.

Each increment emits a `CounterIncrementEvent` with topic `"counter_inc"`.

## Public Function Signatures

```rust
pub fn increment(e: Env, key: Symbol) -> Result<u64, CounterError>;
pub fn increment_by(e: Env, key: Symbol, amount: u64) -> Result<u64, CounterError>;
pub fn get_count(e: Env, key: Symbol) -> u64;
pub fn get_total_count(e: Env) -> u64;
pub fn has_key(e: Env, key: Symbol) -> bool;
```

## Events

```rust
#[contractevent(topics = ["counter_inc"], data_format = "vec")]
pub struct CounterIncrementEvent {
    pub key: Symbol,
    pub amount: u64,
    pub new_count: u64,
    pub total_count: u64,
}
```

## Error Codes (`CounterError`)

- `1`: `Overflow` — Counter addition exceeds `u64::MAX`.
- `2`: `ZeroIncrement` — `amount` provided to `increment_by` is zero.

## Building and Testing

Run test suite:
```sh
cargo test --manifest-path contracts/event_counter/Cargo.toml
```

Run clippy linter:
```sh
cargo clippy --manifest-path contracts/event_counter/Cargo.toml --all-targets -- -D warnings
```
