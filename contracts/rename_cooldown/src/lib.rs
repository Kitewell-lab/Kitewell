#![no_std]

pub mod error;
pub mod events;
pub mod types;

pub use error::CooldownError;
pub use events::{
    AdminTransferredEvent, CooldownResetEvent, CooldownUpdatedEvent,
    EntryCooldownClearedEvent, EntryCooldownSetEvent, InitializedEvent, RenameRecordedEvent,
};
pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Pure helper function to compute remaining ledgers before a rename is permitted.
/// Returns `0` if no cooldown is active (never renamed or cooldown elapsed).
pub fn calculate_remaining_ledgers(
    current_ledger: u32,
    last_rename_ledger: Option<u32>,
    cooldown_ledgers: u32,
) -> u32 {
    match last_rename_ledger {
        None => 0,
        Some(last) => {
            let next_allowed = last.saturating_add(cooldown_ledgers);
            next_allowed.saturating_sub(current_ledger)
        }
    }
}

/// Pure helper function to verify whether a rename is currently allowed.
pub fn is_rename_allowed(
    current_ledger: u32,
    last_rename_ledger: Option<u32>,
    cooldown_ledgers: u32,
) -> bool {
    calculate_remaining_ledgers(current_ledger, last_rename_ledger, cooldown_ledgers) == 0
}

#[contract]
pub struct RenameCooldownContract;

#[contractimpl]
impl RenameCooldownContract {
    /// Initialize the contract with an admin and default minimum cooldown ledgers.
    pub fn initialize(
        e: Env,
        admin: Address,
        min_cooldown_ledgers: u32,
    ) -> Result<(), CooldownError> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(CooldownError::AlreadyInitialized);
        }
        if min_cooldown_ledgers == 0 {
            return Err(CooldownError::ZeroCooldown);
        }

        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage()
            .instance()
            .set(&DataKey::DefaultCooldown, &min_cooldown_ledgers);

        InitializedEvent {
            admin,
            cooldown: min_cooldown_ledgers,
        }
        .publish(&e);

        Ok(())
    }

    /// Retrieve the configured admin address.
    pub fn get_admin(e: Env) -> Result<Address, CooldownError> {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(CooldownError::NotInitialized)
    }

    /// Transfer administrative control to a new address. Only callable by current admin.
    pub fn set_admin(e: Env, new_admin: Address) -> Result<(), CooldownError> {
        let current_admin = Self::get_admin(e.clone())?;
        current_admin.require_auth();

        e.storage().instance().set(&DataKey::Admin, &new_admin);

        AdminTransferredEvent {
            old_admin: current_admin,
            new_admin,
        }
        .publish(&e);

        Ok(())
    }

    /// Retrieve the default global cooldown duration in ledgers.
    pub fn get_cooldown(e: Env) -> Result<u32, CooldownError> {
        e.storage()
            .instance()
            .get(&DataKey::DefaultCooldown)
            .ok_or(CooldownError::NotInitialized)
    }

    /// Update the default global cooldown duration in ledgers. Only callable by admin.
    pub fn set_cooldown(e: Env, new_cooldown: u32) -> Result<(), CooldownError> {
        let admin = Self::get_admin(e.clone())?;
        admin.require_auth();

        if new_cooldown == 0 {
            return Err(CooldownError::ZeroCooldown);
        }

        let old_cooldown = Self::get_cooldown(e.clone())?;
        e.storage()
            .instance()
            .set(&DataKey::DefaultCooldown, &new_cooldown);

        CooldownUpdatedEvent {
            old_cooldown,
            new_cooldown,
        }
        .publish(&e);

        Ok(())
    }

    /// Set an entry-specific cooldown override in ledgers. Only callable by admin.
    pub fn set_entry_cooldown(
        e: Env,
        entry: Address,
        custom_cooldown: u32,
    ) -> Result<(), CooldownError> {
        let admin = Self::get_admin(e.clone())?;
        admin.require_auth();

        if custom_cooldown == 0 {
            return Err(CooldownError::ZeroCooldown);
        }

        e.storage()
            .instance()
            .set(&DataKey::CustomCooldown(entry.clone()), &custom_cooldown);

        EntryCooldownSetEvent {
            entry,
            cooldown: custom_cooldown,
        }
        .publish(&e);

        Ok(())
    }

    /// Clear an entry-specific cooldown override, reverting to default. Only callable by admin.
    pub fn clear_entry_cooldown(e: Env, entry: Address) -> Result<(), CooldownError> {
        let admin = Self::get_admin(e.clone())?;
        admin.require_auth();

        e.storage()
            .instance()
            .remove(&DataKey::CustomCooldown(entry.clone()));

        EntryCooldownClearedEvent { entry, admin }.publish(&e);

        Ok(())
    }

    /// Retrieve the effective cooldown duration for an entry (custom if configured, otherwise default).
    pub fn get_effective_cooldown(e: Env, entry: Address) -> Result<u32, CooldownError> {
        if let Some(custom) = e
            .storage()
            .instance()
            .get(&DataKey::CustomCooldown(entry))
        {
            Ok(custom)
        } else {
            Self::get_cooldown(e)
        }
    }

    /// Retrieve the ledger sequence of the entry's last rename, or None if never renamed.
    pub fn get_last_rename_ledger(e: Env, entry: Address) -> Option<u32> {
        e.storage().instance().get(&DataKey::LastRename(entry))
    }

    /// Retrieve the number of ledgers remaining until an entry can be renamed.
    /// Returns 0 if rename is currently permitted.
    pub fn get_remaining_cooldown(e: Env, entry: Address) -> Result<u32, CooldownError> {
        let effective = Self::get_effective_cooldown(e.clone(), entry.clone())?;
        let current_seq = e.ledger().sequence();
        let last_rename = Self::get_last_rename_ledger(e, entry);

        Ok(calculate_remaining_ledgers(
            current_seq,
            last_rename,
            effective,
        ))
    }

    /// Check if the entry can be renamed at the current ledger sequence.
    pub fn can_rename(e: Env, entry: Address) -> Result<bool, CooldownError> {
        let remaining = Self::get_remaining_cooldown(e, entry)?;
        Ok(remaining == 0)
    }

    /// Assert that the entry can be renamed. Returns Err(CooldownActive) if cooldown is active.
    pub fn assert_can_rename(e: Env, entry: Address) -> Result<(), CooldownError> {
        if !Self::can_rename(e, entry)? {
            Err(CooldownError::CooldownActive)
        } else {
            Ok(())
        }
    }

    /// Record a rename for an entry at the current ledger sequence.
    /// Callable only by the entry itself or the admin.
    pub fn record_rename(e: Env, caller: Address, entry: Address) -> Result<u32, CooldownError> {
        let admin = Self::get_admin(e.clone())?;
        caller.require_auth();

        if caller != entry && caller != admin {
            return Err(CooldownError::Unauthorized);
        }

        Self::assert_can_rename(e.clone(), entry.clone())?;

        let current_seq = e.ledger().sequence();
        let effective = Self::get_effective_cooldown(e.clone(), entry.clone())?;

        e.storage()
            .instance()
            .set(&DataKey::LastRename(entry.clone()), &current_seq);

        let count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::RenameCount(entry.clone()))
            .unwrap_or(0);
        e.storage()
            .instance()
            .set(&DataKey::RenameCount(entry.clone()), &(count + 1));

        let next_allowed_ledger = current_seq.saturating_add(effective);
        RenameRecordedEvent {
            entry,
            caller,
            ledger: current_seq,
            next_allowed_ledger,
        }
        .publish(&e);

        Ok(current_seq)
    }

    /// Reset the cooldown for an entry, allowing immediate rename. Only callable by admin.
    pub fn reset_cooldown(e: Env, entry: Address) -> Result<(), CooldownError> {
        let admin = Self::get_admin(e.clone())?;
        admin.require_auth();

        e.storage()
            .instance()
            .remove(&DataKey::LastRename(entry.clone()));

        CooldownResetEvent { entry, admin }.publish(&e);

        Ok(())
    }

    /// Retrieve the total number of renames performed by an entry.
    pub fn get_rename_count(e: Env, entry: Address) -> u32 {
        e.storage()
            .instance()
            .get(&DataKey::RenameCount(entry))
            .unwrap_or(0)
    }
}
