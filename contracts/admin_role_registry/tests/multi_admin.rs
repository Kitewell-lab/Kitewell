use admin_role_registry::{AdminRoleRegistryContract, AdminRoleRegistryContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_multi_admin_addition_and_removal() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AdminRoleRegistryContract, ());
    let client = AdminRoleRegistryContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);

    client.initialize(&admin1);

    // admin1 adds admin2
    client.add_admin(&admin1, &admin2);
    assert_eq!(client.get_admin_count(), 2);
    assert!(client.is_admin(&admin2));

    // admin2 adds admin3
    client.add_admin(&admin2, &admin3);
    assert_eq!(client.get_admin_count(), 3);
    assert!(client.is_admin(&admin3));

    // admin3 removes admin1
    client.remove_admin(&admin3, &admin1);
    assert_eq!(client.get_admin_count(), 2);
    assert!(!client.is_admin(&admin1));
    assert!(client.is_admin(&admin2));
    assert!(client.is_admin(&admin3));
}
