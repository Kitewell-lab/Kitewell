use soroban_sdk::{testutils::Address as _, Address, Env};
use timestamp_bounds_guard::{
    check_bounds, GuardError, TimestampBoundsGuardContract,
    TimestampBoundsGuardContractClient,
};

#[test]
fn test_exact_single_point_bounds() {
    // min == max: only this exact timestamp is valid
    assert!(check_bounds(5000, 5000, 5000).is_ok());
    assert_eq!(
        check_bounds(4999, 5000, 5000),
        Err(GuardError::TimestampTooEarly)
    );
    assert_eq!(
        check_bounds(5001, 5000, 5000),
        Err(GuardError::TimestampTooLate)
    );
}

#[test]
fn test_u64_max_boundary() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimestampBoundsGuardContract, ());
    let client = TimestampBoundsGuardContractClient::new(&env, &contract_id);

    client.initialize(&admin, &0, &u64::MAX);

    assert!(client.try_validate_timestamp(&0).is_ok());
    assert!(client.try_validate_timestamp(&u64::MAX).is_ok());
    assert!(client.try_validate_timestamp(&(u64::MAX / 2)).is_ok());
}
