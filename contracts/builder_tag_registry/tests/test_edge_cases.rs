#![cfg(test)]

use builder_tag_registry::{BuilderTagRegistry, BuilderTagRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_edge_case_exact_max_limit_boundary() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);

    client.initialize(&admin, &Some(2));
    assert_eq!(client.get_max_tags_limit(), 2);

    let t1 = String::from_str(&env, "tag1");
    let t2 = String::from_str(&env, "tag2");

    client.add_tag(&builder, &t1);
    client.add_tag(&builder, &t2);
    assert_eq!(client.get_tag_count(&builder), 2);

    // Attempting a 3rd tag should fail
    let t3 = String::from_str(&env, "tag3");
    let res = client.try_add_tag(&builder, &t3);
    assert!(res.is_err());
}

#[test]
fn test_edge_case_max_allowed_tag_length_32_bytes() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);

    client.initialize(&admin, &None);

    // Exactly 32 bytes
    let tag_32 = String::from_str(&env, "12345678901234567890123456789012");
    client.add_tag(&builder, &tag_32);
    assert!(client.has_tag(&builder, &tag_32));

    // 1 byte
    let tag_1 = String::from_str(&env, "x");
    client.add_tag(&builder, &tag_1);
    assert!(client.has_tag(&builder, &tag_1));
}

#[test]
fn test_edge_case_clear_empty_tags_returns_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);

    client.initialize(&admin, &None);

    let cleared = client.clear_tags(&builder);
    assert_eq!(cleared, 0);
    assert_eq!(client.get_tag_count(&builder), 0);
}

#[test]
fn test_edge_case_multi_builder_isolation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder_a = Address::generate(&env);
    let builder_b = Address::generate(&env);

    client.initialize(&admin, &None);

    let tag_shared = String::from_str(&env, "rust");
    let tag_unique_b = String::from_str(&env, "python");

    client.add_tag(&builder_a, &tag_shared);
    client.add_tag(&builder_b, &tag_shared);
    client.add_tag(&builder_b, &tag_unique_b);

    assert_eq!(client.get_tag_count(&builder_a), 1);
    assert_eq!(client.get_tag_count(&builder_b), 2);

    client.remove_tag(&builder_b, &tag_shared);
    assert_eq!(client.get_tag_count(&builder_b), 1);
    // Builder A remains unaffected
    assert_eq!(client.get_tag_count(&builder_a), 1);
    assert!(client.has_tag(&builder_a, &tag_shared));
}
