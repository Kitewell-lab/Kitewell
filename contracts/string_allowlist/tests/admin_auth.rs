use soroban_sdk::{testutils::Address as _, Address, Env, String};
use string_allowlist::{StringAllowlistContract, StringAllowlistContractClient};

#[test]
fn test_admin_transfer_and_permissions() {
    let env = Env::default();
    env.mock_all_auths();

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let contract_id = env.register(StringAllowlistContract, ());
    let client = StringAllowlistContractClient::new(&env, &contract_id);

    client.initialize(&admin1);
    assert_eq!(client.get_admin(), admin1);

    // Transfer admin to admin2
    client.set_admin(&admin2);
    assert_eq!(client.get_admin(), admin2);

    // admin2 can perform modifications
    let item = String::from_str(&env, "admin2_item");
    assert!(client.try_add(&item).is_ok());
    assert!(client.is_allowed(&item));
}
