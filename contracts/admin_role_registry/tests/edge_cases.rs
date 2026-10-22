use admin_role_registry::{AdminRoleError, AdminRoleRegistryContract, AdminRoleRegistryContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_cannot_remove_last_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AdminRoleRegistryContract, ());
    let client = AdminRoleRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    // Attempting to remove the sole admin should fail
    let res = client.try_remove_admin(&admin, &admin);
    assert_eq!(res, Err(Ok(AdminRoleError::CannotRemoveLastAdmin)));
    assert_eq!(client.get_admin_count(), 1);
    assert!(client.is_admin(&admin));
}

#[test]
fn test_already_admin_and_no_such_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AdminRoleRegistryContract, ());
    let client = AdminRoleRegistryContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.initialize(&admin1);

    // Duplicate addition
    assert_eq!(
        client.try_add_admin(&admin1, &admin1),
        Err(Ok(AdminRoleError::AlreadyAdmin))
    );

    client.add_admin(&admin1, &admin2);
    assert_eq!(
        client.try_add_admin(&admin1, &admin2),
        Err(Ok(AdminRoleError::AlreadyAdmin))
    );

    // Removing stranger that is not admin
    assert_eq!(
        client.try_remove_admin(&admin1, &stranger),
        Err(Ok(AdminRoleError::NoSuchAdmin))
    );
}
