#![no_std]

pub mod error;
pub mod events;
pub mod types;

pub use error::PausableError;
pub use events::PausedEvent;
pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct PausableFlagContract;

#[contractimpl]
impl PausableFlagContract {
    /// Initialize the pausable flag primitive with an admin.
    /// The default paused state is `false`.
    pub fn initialize(e: Env, admin: Address) -> Result<(), PausableError> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(PausableError::AlreadyInitialized);
        }

        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Paused, &false);

        Ok(())
    }

    /// Set the paused state. Callable only by the authorized admin.
    pub fn set_paused(e: Env, paused: bool) -> Result<(), PausableError> {
        let admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PausableError::NotInitialized)?;

        admin.require_auth();

        e.storage().instance().set(&DataKey::Paused, &paused);
        PausedEvent { paused }.publish(&e);

        Ok(())
    }

    /// Return true if currently paused.
    pub fn is_paused(e: Env) -> Result<bool, PausableError> {
        if !e.storage().instance().has(&DataKey::Admin) {
            return Err(PausableError::NotInitialized);
        }

        let paused: bool = e.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        Ok(paused)
    }

    /// Retrieve the current admin address.
    pub fn get_admin(e: Env) -> Result<Address, PausableError> {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PausableError::NotInitialized)
    }

    /// Asserts that the contract is not paused.
    /// Returns Ok(()) if not paused, or Err(PausableError::ContractPaused) if paused.
    pub fn assert_not_paused(e: Env) -> Result<(), PausableError> {
        let paused = Self::is_paused(e)?;
        if paused {
            return Err(PausableError::ContractPaused);
        }
        Ok(())
    }

    /// Transfer admin role to a new address.
    pub fn set_admin(e: Env, new_admin: Address) -> Result<(), PausableError> {
        let current_admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PausableError::NotInitialized)?;

        current_admin.require_auth();

        e.storage().instance().set(&DataKey::Admin, &new_admin);

        Ok(())
    }
}
