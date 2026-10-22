#![no_std]

pub mod events;
pub mod types;

use events::{
    emit_admin_updated, emit_limit_updated, emit_tag_added, emit_tag_removed, emit_tags_cleared,
};
use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};
use types::{DataKey, TagError, DEFAULT_MAX_TAGS, MAX_TAG_LENGTH};

#[contract]
pub struct BuilderTagRegistry;

#[contractimpl]
impl BuilderTagRegistry {
    /// Initialize the registry contract with an admin and optional custom max tags limit.
    pub fn initialize(env: Env, admin: Address, max_tags: Option<u32>) -> Result<(), TagError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(TagError::AlreadyInitialized);
        }

        let limit = match max_tags {
            Some(lim) => {
                if lim == 0 || lim > 100 {
                    return Err(TagError::InvalidMaxLimit);
                }
                lim
            }
            None => DEFAULT_MAX_TAGS,
        };

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::MaxTagsLimit, &limit);

        Ok(())
    }

    /// Add a unique tag to a builder's address. Requires builder authorization.
    pub fn add_tag(env: Env, builder: Address, tag: String) -> Result<(), TagError> {
        builder.require_auth();

        if tag.is_empty() {
            return Err(TagError::TagEmpty);
        }
        if tag.len() > MAX_TAG_LENGTH {
            return Err(TagError::TagTooLong);
        }

        let max_limit: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxTagsLimit)
            .unwrap_or(DEFAULT_MAX_TAGS);

        let key = DataKey::BuilderTags(builder.clone());
        let mut tags: Vec<String> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env));

        // Deduplication check
        for existing in tags.iter() {
            if existing == tag {
                return Err(TagError::TagAlreadyExists);
            }
        }

        if tags.len() >= max_limit {
            return Err(TagError::TagLimitReached);
        }

        tags.push_back(tag.clone());
        env.storage().persistent().set(&key, &tags);

        emit_tag_added(&env, &builder, &tag);
        Ok(())
    }

    /// Remove a tag from a builder's profile. Requires builder authorization.
    pub fn remove_tag(env: Env, builder: Address, tag: String) -> Result<(), TagError> {
        builder.require_auth();

        let key = DataKey::BuilderTags(builder.clone());
        let tags: Vec<String> = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(TagError::TagNotFound)?;

        let mut found_index: Option<u32> = None;
        for (i, existing) in tags.iter().enumerate() {
            if existing == tag {
                found_index = Some(i as u32);
                break;
            }
        }

        let idx = found_index.ok_or(TagError::TagNotFound)?;
        let mut new_tags = Vec::new(&env);
        for (i, existing) in tags.iter().enumerate() {
            if (i as u32) != idx {
                new_tags.push_back(existing);
            }
        }

        if new_tags.is_empty() {
            env.storage().persistent().remove(&key);
        } else {
            env.storage().persistent().set(&key, &new_tags);
        }

        emit_tag_removed(&env, &builder, &tag);
        Ok(())
    }

    /// Clear all tags for a builder. Requires builder authorization.
    pub fn clear_tags(env: Env, builder: Address) -> Result<u32, TagError> {
        builder.require_auth();

        let key = DataKey::BuilderTags(builder.clone());
        let count = match env.storage().persistent().get::<DataKey, Vec<String>>(&key) {
            Some(tags) => {
                let len = tags.len();
                env.storage().persistent().remove(&key);
                len
            }
            None => 0,
        };

        if count > 0 {
            emit_tags_cleared(&env, &builder, count);
        }

        Ok(count)
    }

    /// Retrieve all tags associated with a builder.
    pub fn get_tags(env: Env, builder: Address) -> Vec<String> {
        let key = DataKey::BuilderTags(builder);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Check if a builder has a specific tag.
    pub fn has_tag(env: Env, builder: Address, tag: String) -> bool {
        let key = DataKey::BuilderTags(builder);
        if let Some(tags) = env.storage().persistent().get::<DataKey, Vec<String>>(&key) {
            for existing in tags.iter() {
                if existing == tag {
                    return true;
                }
            }
        }
        false
    }

    /// Return the count of tags assigned to a builder.
    pub fn get_tag_count(env: Env, builder: Address) -> u32 {
        let key = DataKey::BuilderTags(builder);
        env.storage()
            .persistent()
            .get::<DataKey, Vec<String>>(&key)
            .map(|t| t.len())
            .unwrap_or(0)
    }

    /// Return current administrator address.
    pub fn get_admin(env: Env) -> Result<Address, TagError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TagError::NotInitialized)
    }

    /// Update administrator address. Requires current admin authorization.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), TagError> {
        let current_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TagError::NotInitialized)?;

        current_admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);

        emit_admin_updated(&env, &current_admin, &new_admin);
        Ok(())
    }

    /// Retrieve current maximum tags limit.
    pub fn get_max_tags_limit(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::MaxTagsLimit)
            .unwrap_or(DEFAULT_MAX_TAGS)
    }

    /// Update maximum tags limit. Requires admin authorization.
    pub fn set_max_tags_limit(env: Env, new_limit: u32) -> Result<(), TagError> {
        if new_limit == 0 || new_limit > 100 {
            return Err(TagError::InvalidMaxLimit);
        }

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TagError::NotInitialized)?;

        admin.require_auth();

        let old_limit: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxTagsLimit)
            .unwrap_or(DEFAULT_MAX_TAGS);

        env.storage()
            .instance()
            .set(&DataKey::MaxTagsLimit, &new_limit);

        emit_limit_updated(&env, old_limit, new_limit);
        Ok(())
    }
}
