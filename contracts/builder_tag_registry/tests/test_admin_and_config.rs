#![cfg(test)]

use builder_tag_registry::types::TagError;
use builder_tag_registry::{BuilderTagRegistry, BuilderTagRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_admin_transfer_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.initialize(&admin1, &None);
    assert_eq!(client.get_admin(), admin1);

    // Transfer admin
    client.set_admin(&admin2);
    assert_eq!(client.get_admin(), admin2);
}

#[test]
fn test_admin_update_max_limit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);

    client.initialize(&admin, &Some(1));
    assert_eq!(client.get_max_tags_limit(), 1);

    let t1 = String::from_str(&env, "tag1");
    let t2 = String::from_str(&env, "tag2");

    client.add_tag(&builder, &t1);
    // Limit reached
    assert!(client.try_add_tag(&builder, &t2).is_err());

    // Admin expands limit to 5
    client.set_max_tags_limit(&5);
    assert_eq!(client.get_max_tags_limit(), 5);

    // Now adding t2 succeeds
    client.add_tag(&builder, &t2);
    assert_eq!(client.get_tag_count(&builder), 2);
}

#[test]
fn test_admin_update_invalid_limit_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &None);

    let err = client.try_set_max_tags_limit(&0).unwrap_err().unwrap();
    assert_eq!(err, TagError::InvalidMaxLimit);

    let err2 = client.try_set_max_tags_limit(&101).unwrap_err().unwrap();
    assert_eq!(err2, TagError::InvalidMaxLimit);
}
