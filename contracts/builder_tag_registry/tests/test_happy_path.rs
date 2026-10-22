#![cfg(test)]

use builder_tag_registry::{BuilderTagRegistry, BuilderTagRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_happy_path_initialize_and_add_tags() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);

    client.initialize(&admin, &None);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_max_tags_limit(), 10);
    assert_eq!(client.get_tag_count(&builder), 0);

    let tag1 = String::from_str(&env, "rust");
    let tag2 = String::from_str(&env, "soroban");
    let tag3 = String::from_str(&env, "stellar");

    client.add_tag(&builder, &tag1);
    client.add_tag(&builder, &tag2);
    client.add_tag(&builder, &tag3);

    assert_eq!(client.get_tag_count(&builder), 3);
    assert!(client.has_tag(&builder, &tag1));
    assert!(client.has_tag(&builder, &tag2));
    assert!(client.has_tag(&builder, &tag3));

    let tags = client.get_tags(&builder);
    assert_eq!(tags.len(), 3);
    assert_eq!(tags.get(0).unwrap(), tag1);
    assert_eq!(tags.get(1).unwrap(), tag2);
    assert_eq!(tags.get(2).unwrap(), tag3);
}

#[test]
fn test_happy_path_remove_and_clear_tags() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BuilderTagRegistry, ());
    let client = BuilderTagRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let builder = Address::generate(&env);

    client.initialize(&admin, &Some(5));

    let tag_frontend = String::from_str(&env, "frontend");
    let tag_backend = String::from_str(&env, "backend");
    let tag_defi = String::from_str(&env, "defi");

    client.add_tag(&builder, &tag_frontend);
    client.add_tag(&builder, &tag_backend);
    client.add_tag(&builder, &tag_defi);

    // Remove middle tag
    client.remove_tag(&builder, &tag_backend);
    assert_eq!(client.get_tag_count(&builder), 2);
    assert!(!client.has_tag(&builder, &tag_backend));
    assert!(client.has_tag(&builder, &tag_frontend));
    assert!(client.has_tag(&builder, &tag_defi));

    // Clear remaining tags
    let cleared_count = client.clear_tags(&builder);
    assert_eq!(cleared_count, 2);
    assert_eq!(client.get_tag_count(&builder), 0);
    assert!(!client.has_tag(&builder, &tag_frontend));
}
