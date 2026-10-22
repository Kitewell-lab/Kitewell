use soroban_sdk::{testutils::Address as _, Address, Env, String};
use string_allowlist::{
    AllowlistError, StringAllowlistContract, StringAllowlistContractClient,
};

#[test]
fn test_uninitialized_and_duplicate_error_cases() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StringAllowlistContract, ());
    let client = StringAllowlistContractClient::new(&env, &contract_id);

    let item = String::from_str(&env, "example");

    // Uninitialized calls fail
    assert_eq!(
        client.try_add(&item),
        Err(Ok(AllowlistError::NotInitialized))
    );
    assert_eq!(
        client.try_remove(&item),
        Err(Ok(AllowlistError::NotInitialized))
    );
    assert_eq!(
        client.try_get_admin(),
        Err(Ok(AllowlistError::NotInitialized))
    );

    // Initialize
    let admin = Address::generate(&env);
    assert!(client.try_initialize(&admin).is_ok());

    // Double init fails
    assert_eq!(
        client.try_initialize(&admin),
        Err(Ok(AllowlistError::AlreadyInitialized))
    );

    // Add once succeeds
    assert!(client.try_add(&item).is_ok());

    // Duplicate add fails
    assert_eq!(
        client.try_add(&item),
        Err(Ok(AllowlistError::AlreadyAllowed))
    );

    // Remove item succeeds
    assert!(client.try_remove(&item).is_ok());

    // Remove nonexistent item fails
    assert_eq!(
        client.try_remove(&item),
        Err(Ok(AllowlistError::NotAllowed))
    );
}
