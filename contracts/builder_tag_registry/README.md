# Builder Tag Registry Contract

Standalone Soroban smart contract crate implementing the **Builder Tag Registry** primitive for the Kitewell ecosystem.

## Overview

The `builder_tag_registry` crate allows Stellar/Soroban builders to register and manage deduplicated identity and classification tags (e.g. `"rust"`, `"soroban"`, `"defi"`, `"frontend"`).

Key features:
- **Deduplication**: Tags assigned to a builder are strictly unique.
- **Configurable Capacity**: Configurable upper bound on maximum tags allowed per builder (default `10`, range `1..=100`).
- **Validation**: Strict boundary checks on non-empty tag strings and maximum 32-byte string length.
- **Authorization**: Tag operations (`add_tag`, `remove_tag`, `clear_tags`) require explicit builder signature. Administrative settings (`set_admin`, `set_max_tags_limit`) require admin authorization.
- **Auditable Events**: Emits standardized Soroban contract events for all state changes.

## Public Function Signatures

### Administrative Functions

```rust
pub fn initialize(env: Env, admin: Address, max_tags: Option<u32>) -> Result<(), TagError>;
pub fn get_admin(env: Env) -> Result<Address, TagError>;
pub fn set_admin(env: Env, new_admin: Address) -> Result<(), TagError>;
pub fn get_max_tags_limit(env: Env) -> u32;
pub fn set_max_tags_limit(env: Env, new_limit: u32) -> Result<(), TagError>;
```

### Builder Tag Management

```rust
pub fn add_tag(env: Env, builder: Address, tag: String) -> Result<(), TagError>;
pub fn remove_tag(env: Env, builder: Address, tag: String) -> Result<(), TagError>;
pub fn clear_tags(env: Env, builder: Address) -> Result<u32, TagError>;
pub fn get_tags(env: Env, builder: Address) -> Vec<String>;
pub fn has_tag(env: Env, builder: Address, tag: String) -> bool;
pub fn get_tag_count(env: Env, builder: Address) -> u32;
```

## Testing & Verification

Run tests:
```bash
cargo test --manifest-path contracts/builder_tag_registry/Cargo.toml
```

Run Clippy checks:
```bash
cargo clippy --manifest-path contracts/builder_tag_registry/Cargo.toml --all-targets -- -D warnings
```
