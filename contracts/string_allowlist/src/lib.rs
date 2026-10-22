#![no_std]

pub mod error;
pub mod events;
pub mod types;

pub use error::AllowlistError;
pub use events::{StringAddedEvent, StringRemovedEvent};
pub use types::{DataKey, MAX_STRING_LEN};

use soroban_sdk::{contract, contractimpl, Address, Env, String};

#[contract]
pub struct StringAllowlistContract;

#[contractimpl]
impl StringAllowlistContract {
    /// Initialize the string allowlist with an admin address.
    pub fn initialize(e: Env, admin: Address) -> Result<(), AllowlistError> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(AllowlistError::AlreadyInitialized);
        }

        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Count, &0u32);

        Ok(())
    }

    /// Add a string to the allowlist. Only callable by admin.
    pub fn add(e: Env, item: String) -> Result<(), AllowlistError> {
        let admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(AllowlistError::NotInitialized)?;

        admin.require_auth();

        let len = item.len();
        if len == 0 {
            return Err(AllowlistError::StringEmpty);
        }
        if len > MAX_STRING_LEN {
            return Err(AllowlistError::StringTooLong);
        }

        let key = DataKey::Allowed(item.clone());
        if e.storage().instance().has(&key) {
            return Err(AllowlistError::AlreadyAllowed);
        }

        e.storage().instance().set(&key, &true);

        let count: u32 = e.storage().instance().get(&DataKey::Count).unwrap_or(0);
        e.storage().instance().set(&DataKey::Count, &(count + 1));

        StringAddedEvent { item }.publish(&e);

        Ok(())
    }

    /// Remove a string from the allowlist. Only callable by admin.
    pub fn remove(e: Env, item: String) -> Result<(), AllowlistError> {
        let admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(AllowlistError::NotInitialized)?;

        admin.require_auth();

        let key = DataKey::Allowed(item.clone());
        if !e.storage().instance().has(&key) {
            return Err(AllowlistError::NotAllowed);
        }

        e.storage().instance().remove(&key);

        let count: u32 = e.storage().instance().get(&DataKey::Count).unwrap_or(1);
        e.storage()
            .instance()
            .set(&DataKey::Count, &count.saturating_sub(1));

        StringRemovedEvent { item }.publish(&e);

        Ok(())
    }

    /// Check whether a string is present in the allowlist.
    pub fn is_allowed(e: Env, item: String) -> bool {
        e.storage().instance().has(&DataKey::Allowed(item))
    }

    /// Return the total number of currently allowlisted strings.
    pub fn get_count(e: Env) -> u32 {
        e.storage().instance().get(&DataKey::Count).unwrap_or(0)
    }

    /// Retrieve the current admin address.
    pub fn get_admin(e: Env) -> Result<Address, AllowlistError> {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(AllowlistError::NotInitialized)
    }

    /// Transfer administrative control to a new address.
    pub fn set_admin(e: Env, new_admin: Address) -> Result<(), AllowlistError> {
        let current_admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(AllowlistError::NotInitialized)?;

        current_admin.require_auth();

        e.storage().instance().set(&DataKey::Admin, &new_admin);

        Ok(())
    }
}
