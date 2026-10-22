#![no_std]

pub mod error;
pub mod types;

pub use error::GuardError;
pub use types::{DataKey, TimestampBounds};

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Pure helper function to check whether a timestamp falls within inclusive bounds.
pub fn check_bounds(timestamp: u64, min: u64, max: u64) -> Result<(), GuardError> {
    if min > max {
        return Err(GuardError::InvalidBounds);
    }
    if timestamp < min {
        return Err(GuardError::TimestampTooEarly);
    }
    if timestamp > max {
        return Err(GuardError::TimestampTooLate);
    }
    Ok(())
}

#[contract]
pub struct TimestampBoundsGuardContract;

#[contractimpl]
impl TimestampBoundsGuardContract {
    /// Initialize the guard with an admin address and initial bounds.
    pub fn initialize(
        e: Env,
        admin: Address,
        min_timestamp: u64,
        max_timestamp: u64,
    ) -> Result<(), GuardError> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(GuardError::AlreadyInitialized);
        }
        if min_timestamp > max_timestamp {
            return Err(GuardError::InvalidBounds);
        }

        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(
            &DataKey::Bounds,
            &TimestampBounds {
                min_timestamp,
                max_timestamp,
            },
        );

        Ok(())
    }

    /// Update the timestamp bounds. Only callable by admin.
    pub fn set_bounds(e: Env, min_timestamp: u64, max_timestamp: u64) -> Result<(), GuardError> {
        let admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(GuardError::NotInitialized)?;

        admin.require_auth();

        if min_timestamp > max_timestamp {
            return Err(GuardError::InvalidBounds);
        }

        e.storage().instance().set(
            &DataKey::Bounds,
            &TimestampBounds {
                min_timestamp,
                max_timestamp,
            },
        );

        Ok(())
    }

    /// Retrieve the current configured bounds.
    pub fn get_bounds(e: Env) -> Result<TimestampBounds, GuardError> {
        e.storage()
            .instance()
            .get(&DataKey::Bounds)
            .ok_or(GuardError::NotInitialized)
    }

    /// Retrieve the current configured admin address.
    pub fn get_admin(e: Env) -> Result<Address, GuardError> {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(GuardError::NotInitialized)
    }

    /// Validate a given timestamp against the stored bounds.
    pub fn validate_timestamp(e: Env, timestamp: u64) -> Result<(), GuardError> {
        let bounds: TimestampBounds = e
            .storage()
            .instance()
            .get(&DataKey::Bounds)
            .ok_or(GuardError::NotInitialized)?;

        check_bounds(timestamp, bounds.min_timestamp, bounds.max_timestamp)
    }

    /// Validate the current ledger timestamp against the stored bounds.
    pub fn validate_current_ledger(e: Env) -> Result<(), GuardError> {
        let ledger_time = e.ledger().timestamp();
        Self::validate_timestamp(e, ledger_time)
    }
}
