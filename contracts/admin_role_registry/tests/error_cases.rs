use admin_role_registry::{AdminRoleError, AdminRoleRegistryContract, AdminRoleRegistryContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_uninitialized_and_double_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AdminRoleRegistryContract, ());
    let client = AdminRoleRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    // Call before initialize
    assert_eq!(
        client.try_add_admin(&admin, &user),
        Err(Ok(AdminRoleError::NotInitialized))
    );
    assert_eq!(
        client.try_get_admin_count(),
        Err(Ok(AdminRoleError::NotInitialized))
    );

    // First init ok
    client.initialize(&admin);

    // Double init fails
    assert_eq!(
        client.try_initialize(&user),
        Err(Ok(AdminRoleError::AlreadyInitialized))
    );
}

#[test]
fn test_unauthorized_caller_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AdminRoleRegistryContract, ());
    let client = AdminRoleRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let victim = Address::generate(&env);

    client.initialize(&admin);

    // Attacker cannot add or remove admins
    assert_eq!(
        client.try_add_admin(&attacker, &victim),
        Err(Ok(AdminRoleError::NotAuthorized))
    );
    assert_eq!(
        client.try_remove_admin(&attacker, &admin),
        Err(Ok(AdminRoleError::NotAuthorized))
    );
}
