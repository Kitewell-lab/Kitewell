use soroban_sdk::{testutils::Address as _, Address, Env, String};
use string_allowlist::{StringAllowlistContract, StringAllowlistContractClient};

#[test]
fn test_allowlist_lifecycle_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(StringAllowlistContract, ());
    let client = StringAllowlistContractClient::new(&env, &contract_id);

    client.initialize(&admin);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_count(), 0);

    let lab1 = String::from_str(&env, "stellar_lab_1");
    let lab2 = String::from_str(&env, "stellar_lab_2");

    assert!(!client.is_allowed(&lab1));

    // Add lab1
    client.add(&lab1);
    assert!(client.is_allowed(&lab1));
    assert_eq!(client.get_count(), 1);

    // Add lab2
    client.add(&lab2);
    assert!(client.is_allowed(&lab2));
    assert_eq!(client.get_count(), 2);

    // Remove lab1
    client.remove(&lab1);
    assert!(!client.is_allowed(&lab1));
    assert!(client.is_allowed(&lab2));
    assert_eq!(client.get_count(), 1);
}
