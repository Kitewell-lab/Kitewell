# Admin-Managed String Allowlist

`string-allowlist` is a standalone, reusable Soroban smart contract primitive for maintaining an administrator-controlled allowlist of short strings (e.g., lab names, identifiers).

## Overview

The primitive maintains an on-chain allowlist where each item is a short `String` (up to 64 bytes):
- `initialize(e, admin)`: Initializes the contract with an admin address.
- `add(e, item)`: Adds a new string to the allowlist (admin only). Emits `StringAddedEvent`.
- `remove(e, item)`: Removes an existing string from the allowlist (admin only). Emits `StringRemovedEvent`.
- `is_allowed(e, item)`: Returns `true` if the string is present in the allowlist.
- `get_count(e)`: Returns the current count of allowlisted items.
- `get_admin(e)`: Returns the current admin address.
- `set_admin(e, new_admin)`: Transfers administrative control (admin only).

## Public Function Signatures

```rust
pub fn initialize(e: Env, admin: Address) -> Result<(), AllowlistError>;
pub fn add(e: Env, item: String) -> Result<(), AllowlistError>;
pub fn remove(e: Env, item: String) -> Result<(), AllowlistError>;
pub fn is_allowed(e: Env, item: String) -> bool;
pub fn get_count(e: Env) -> u32;
pub fn get_admin(e: Env) -> Result<Address, AllowlistError>;
pub fn set_admin(e: Env, new_admin: Address) -> Result<(), AllowlistError>;
```

## Events

```rust
#[contractevent(topics = ["allow_add"], data_format = "single-value")]
pub struct StringAddedEvent {
    pub item: String,
}

#[contractevent(topics = ["allow_rem"], data_format = "single-value")]
pub struct StringRemovedEvent {
    pub item: String,
}
```

## Error Codes (`AllowlistError`)

- `1`: `NotInitialized` — The contract has not been initialized.
- `2`: `AlreadyInitialized` — Initialization was called more than once.
- `3`: `StringEmpty` — String length is 0.
- `4`: `StringTooLong` — String length exceeds `MAX_STRING_LEN` (64 bytes).
- `5`: `AlreadyAllowed` — The string is already present in the allowlist.
- `6`: `NotAllowed` — Attempted to remove a string not in the allowlist.

## Building and Testing

Run test suite:
```sh
cargo test --manifest-path contracts/string_allowlist/Cargo.toml
```

Run clippy linter:
```sh
cargo clippy --manifest-path contracts/string_allowlist/Cargo.toml --all-targets -- -D warnings
```
