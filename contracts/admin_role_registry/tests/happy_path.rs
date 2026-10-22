use admin_role_registry::{AdminRoleRegistryContract, AdminRoleRegistryContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialization_and_admin_check() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AdminRoleRegistryContract, ());
    let client = AdminRoleRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    assert!(client.is_admin(&admin));
    assert_eq!(client.get_admin_count(), 1);

    // require_admin passes for the initial admin
    assert!(client.try_require_admin(&admin).is_ok());

    let non_admin = Address::generate(&env);
    assert!(!client.is_admin(&non_admin));
    assert!(client.try_require_admin(&non_admin).is_err());
}
