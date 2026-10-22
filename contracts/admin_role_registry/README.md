# `admin-role-registry`

`contracts/admin_role_registry/` is a standalone Soroban smart contract primitive providing a minimal multi-administrator role management registry.

## Overview

The contract manages a decentralized set of admin accounts with the following capabilities:
- **Initialization**: Bootstraps the registry with a designated initial admin.
- **Admin Management**: Any current administrator can add new administrators or remove existing ones.
- **Last-Admin Protection**: Guarantees that at least one administrator remains active at all times, preventing registry lockout.
- **Role Verification**: Fast on-chain queries (`is_admin`) and assertion gates (`require_admin`) with cryptographic signature checks.

## Public Interface

```rust
impl AdminRoleRegistryContract {
    pub fn initialize(e: Env, initial_admin: Address) -> Result<(), AdminRoleError>;
    pub fn add_admin(e: Env, caller: Address, new_admin: Address) -> Result<(), AdminRoleError>;
    pub fn remove_admin(e: Env, caller: Address, admin_to_remove: Address) -> Result<(), AdminRoleError>;
    pub fn is_admin(e: Env, address: Address) -> bool;
    pub fn require_admin(e: Env, address: Address) -> Result<(), AdminRoleError>;
    pub fn get_admin_count(e: Env) -> Result<u32, AdminRoleError>;
}
```

## Error Codes

- `NotInitialized (1)`: Called an action before the contract was initialized.
- `AlreadyInitialized (2)`: Attempted to initialize an already initialized contract.
- `NotAuthorized (3)`: Caller does not possess the administrator role or lacks auth signature.
- `AlreadyAdmin (4)`: Target address is already an administrator.
- `NoSuchAdmin (5)`: Target address to remove is not currently an administrator.
- `CannotRemoveLastAdmin (6)`: Safety check triggered: cannot remove the sole remaining administrator.

## Building and Testing

Run unit and integration tests:
```bash
cargo test --manifest-path contracts/admin_role_registry/Cargo.toml
```

Run clippy linter:
```bash
cargo clippy --manifest-path contracts/admin_role_registry/Cargo.toml --all-targets -- -D warnings
```
