#![cfg(test)]

use builder_tag_registry::types::TagError;
use builder_tag_registry::{BuilderTagRegistry, BuilderTagRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_error_double_initialization_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &None);

    let err = client.try_initialize(&admin, &None).unwrap_err().unwrap();
    assert_eq!(err, TagError::AlreadyInitialized);
}

#[test]
fn test_error_empty_tag_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);
    client.initialize(&admin, &None);

    let empty_tag = String::from_str(&env, "");
    let err = client.try_add_tag(&builder, &empty_tag).unwrap_err().unwrap();
    assert_eq!(err, TagError::TagEmpty);
}

#[test]
fn test_error_tag_too_long_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);
    client.initialize(&admin, &None);

    // 33 characters (exceeds max 32)
    let long_tag = String::from_str(&env, "123456789012345678901234567890123");
    let err = client.try_add_tag(&builder, &long_tag).unwrap_err().unwrap();
    assert_eq!(err, TagError::TagTooLong);
}

#[test]
fn test_error_duplicate_tag_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);
    client.initialize(&admin, &None);

    let tag = String::from_str(&env, "rust");
    client.add_tag(&builder, &tag);

    let err = client.try_add_tag(&builder, &tag).unwrap_err().unwrap();
    assert_eq!(err, TagError::TagAlreadyExists);
}

#[test]
fn test_error_remove_nonexistent_tag_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);
    client.initialize(&admin, &None);

    let tag = String::from_str(&env, "ghost");
    let err = client.try_remove_tag(&builder, &tag).unwrap_err().unwrap();
    assert_eq!(err, TagError::TagNotFound);
}

#[test]
fn test_error_invalid_max_limit_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    // Limit = 0 rejected
    let err0 = client.try_initialize(&admin, &Some(0)).unwrap_err().unwrap();
    assert_eq!(err0, TagError::InvalidMaxLimit);

    // Limit = 101 rejected
    let err101 = client.try_initialize(&admin, &Some(101)).unwrap_err().unwrap();
    assert_eq!(err101, TagError::InvalidMaxLimit);
}
