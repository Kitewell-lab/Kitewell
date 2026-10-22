use soroban_sdk::{testutils::Address as _, Address, Env};
use timestamp_bounds_guard::{
    check_bounds, GuardError, TimestampBoundsGuardContract,
    TimestampBoundsGuardContractClient,
};

#[test]
fn test_invalid_bounds_rejected() {
    assert_eq!(
        check_bounds(1500, 2000, 1000),
        Err(GuardError::InvalidBounds)
    );

    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimestampBoundsGuardContract, ());
    let client = TimestampBoundsGuardContractClient::new(&env, &contract_id);

    // Initializing with min > max fails
    let res = client.try_initialize(&admin, &5000, &1000);
    assert_eq!(res, Err(Ok(GuardError::InvalidBounds)));
}

#[test]
fn test_uninitialized_and_double_initialization_errors() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimestampBoundsGuardContract, ());
    let client = TimestampBoundsGuardContractClient::new(&env, &contract_id);

    // Calling before initialize fails with NotInitialized
    assert_eq!(client.try_get_bounds(), Err(Ok(GuardError::NotInitialized)));
    assert_eq!(client.try_validate_timestamp(&100), Err(Ok(GuardError::NotInitialized)));

    // First init succeeds
    assert!(client.try_initialize(&admin, &100, &200).is_ok());

    // Second init fails with AlreadyInitialized
    assert_eq!(
        client.try_initialize(&admin, &100, &200),
        Err(Ok(GuardError::AlreadyInitialized))
    );
}

#[test]
fn test_out_of_bounds_validation_errors() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimestampBoundsGuardContract, ());
    let client = TimestampBoundsGuardContractClient::new(&env, &contract_id);

    client.initialize(&admin, &1000, &2000);

    // Too early
    assert_eq!(
        client.try_validate_timestamp(&999),
        Err(Ok(GuardError::TimestampTooEarly))
    );

    // Too late
    assert_eq!(
        client.try_validate_timestamp(&2001),
        Err(Ok(GuardError::TimestampTooLate))
    );
}
