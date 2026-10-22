#![no_std]

pub mod error;
pub mod events;
pub mod types;

pub use error::AdminRoleError;
pub use events::{AdminAddedEvent, AdminRemovedEvent};
pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct AdminRoleRegistryContract;

#[contractimpl]
impl AdminRoleRegistryContract {
    /// Initialize the registry with an initial administrator.
    pub fn initialize(e: Env, initial_admin: Address) -> Result<(), AdminRoleError> {
        if e.storage().instance().has(&DataKey::Initialized) {
            return Err(AdminRoleError::AlreadyInitialized);
        }

        e.storage().instance().set(&DataKey::Initialized, &true);
        e.storage().instance().set(&DataKey::AdminCount, &1u32);
        e.storage()
            .instance()
            .set(&DataKey::IsAdmin(initial_admin.clone()), &true);

        AdminAddedEvent {
            admin: initial_admin,
        }
        .publish(&e);

        Ok(())
    }

    /// Add a new administrator. Caller must be an existing admin.
    pub fn add_admin(
        e: Env,
        caller: Address,
        new_admin: Address,
    ) -> Result<(), AdminRoleError> {
        Self::check_initialized(&e)?;

        caller.require_auth();

        if !Self::is_admin(e.clone(), caller) {
            return Err(AdminRoleError::NotAuthorized);
        }

        if Self::is_admin(e.clone(), new_admin.clone()) {
            return Err(AdminRoleError::AlreadyAdmin);
        }

        let current_count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::AdminCount)
            .unwrap_or(0);

        e.storage()
            .instance()
            .set(&DataKey::AdminCount, &(current_count + 1));
        e.storage()
            .instance()
            .set(&DataKey::IsAdmin(new_admin.clone()), &true);

        AdminAddedEvent { admin: new_admin }.publish(&e);

        Ok(())
    }

    /// Remove an administrator. Caller must be an existing admin.
    /// At least one administrator must remain at all times.
    pub fn remove_admin(
        e: Env,
        caller: Address,
        admin_to_remove: Address,
    ) -> Result<(), AdminRoleError> {
        Self::check_initialized(&e)?;

        caller.require_auth();

        if !Self::is_admin(e.clone(), caller) {
            return Err(AdminRoleError::NotAuthorized);
        }

        if !Self::is_admin(e.clone(), admin_to_remove.clone()) {
            return Err(AdminRoleError::NoSuchAdmin);
        }

        let current_count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::AdminCount)
            .unwrap_or(0);

        if current_count <= 1 {
            return Err(AdminRoleError::CannotRemoveLastAdmin);
        }

        e.storage()
            .instance()
            .set(&DataKey::AdminCount, &(current_count - 1));
        e.storage()
            .instance()
            .remove(&DataKey::IsAdmin(admin_to_remove.clone()));

        AdminRemovedEvent {
            admin: admin_to_remove,
        }
        .publish(&e);

        Ok(())
    }

    /// Check if the specified address is currently an administrator.
    pub fn is_admin(e: Env, address: Address) -> bool {
        e.storage()
            .instance()
            .get(&DataKey::IsAdmin(address))
            .unwrap_or(false)
    }

    /// Requires the address to be an admin and validates its authentication signature.
    pub fn require_admin(e: Env, address: Address) -> Result<(), AdminRoleError> {
        Self::check_initialized(&e)?;

        address.require_auth();

        if !Self::is_admin(e, address) {
            return Err(AdminRoleError::NotAuthorized);
        }

        Ok(())
    }

    /// Returns the total number of registered administrators.
    pub fn get_admin_count(e: Env) -> Result<u32, AdminRoleError> {
        Self::check_initialized(&e)?;

        let count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::AdminCount)
            .unwrap_or(0);

        Ok(count)
    }

    fn check_initialized(e: &Env) -> Result<(), AdminRoleError> {
        if !e.storage().instance().has(&DataKey::Initialized) {
            Err(AdminRoleError::NotInitialized)
        } else {
            Ok(())
        }
    }
}
