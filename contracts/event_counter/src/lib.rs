#![no_std]

pub mod error;
pub mod events;
pub mod types;

pub use error::CounterError;
pub use events::CounterIncrementEvent;
pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct EventCounterContract;

#[contractimpl]
impl EventCounterContract {
    /// Increment the counter for a given key by 1 and emit a CounterIncrementEvent.
    pub fn increment(e: Env, key: Symbol) -> Result<u64, CounterError> {
        Self::increment_by(e, key, 1)
    }

    /// Increment the counter for a given key by `amount` and emit a CounterIncrementEvent.
    pub fn increment_by(e: Env, key: Symbol, amount: u64) -> Result<u64, CounterError> {
        if amount == 0 {
            return Err(CounterError::ZeroIncrement);
        }

        let current_key_count: u64 = e
            .storage()
            .instance()
            .get(&DataKey::KeyCount(key.clone()))
            .unwrap_or(0);

        let new_key_count = current_key_count
            .checked_add(amount)
            .ok_or(CounterError::Overflow)?;

        let current_total: u64 = e
            .storage()
            .instance()
            .get(&DataKey::TotalCount)
            .unwrap_or(0);

        let new_total = current_total
            .checked_add(amount)
            .ok_or(CounterError::Overflow)?;

        e.storage()
            .instance()
            .set(&DataKey::KeyCount(key.clone()), &new_key_count);
        e.storage().instance().set(&DataKey::TotalCount, &new_total);

        CounterIncrementEvent {
            key,
            amount,
            new_count: new_key_count,
            total_count: new_total,
        }
        .publish(&e);

        Ok(new_key_count)
    }

    /// Retrieve the current count for a given key (defaults to 0 if not yet set).
    pub fn get_count(e: Env, key: Symbol) -> u64 {
        e.storage()
            .instance()
            .get(&DataKey::KeyCount(key))
            .unwrap_or(0)
    }

    /// Retrieve the sum total of all increments across all keys.
    pub fn get_total_count(e: Env) -> u64 {
        e.storage().instance().get(&DataKey::TotalCount).unwrap_or(0)
    }

    /// Check whether a given key has ever been incremented.
    pub fn has_key(e: Env, key: Symbol) -> bool {
        e.storage().instance().has(&DataKey::KeyCount(key))
    }
}
