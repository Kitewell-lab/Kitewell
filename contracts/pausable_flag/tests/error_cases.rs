use pausable_flag::{PausableError, PausableFlagContract, PausableFlagContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_uninitialized_calls_fail() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PausableFlagContract, ());
    let client = PausableFlagContractClient::new(&env, &contract_id);

    assert_eq!(
        client.try_is_paused(),
        Err(Ok(PausableError::NotInitialized))
    );
    assert_eq!(
        client.try_get_admin(),
        Err(Ok(PausableError::NotInitialized))
    );
    assert_eq!(
        client.try_assert_not_paused(),
        Err(Ok(PausableError::NotInitialized))
    );
    assert_eq!(
        client.try_set_paused(&true),
        Err(Ok(PausableError::NotInitialized))
    );
}

#[test]
fn test_double_initialization_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(PausableFlagContract, ());
    let client = PausableFlagContractClient::new(&env, &contract_id);

    assert!(client.try_initialize(&admin).is_ok());
    assert_eq!(
        client.try_initialize(&admin),
        Err(Ok(PausableError::AlreadyInitialized))
    );
}
