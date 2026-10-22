use soroban_sdk::{testutils::Address as _, Address, Env};
use timestamp_bounds_guard::{
    check_bounds, TimestampBounds, TimestampBoundsGuardContract,
    TimestampBoundsGuardContractClient,
};

#[test]
fn test_pure_check_bounds_happy_path() {
    assert!(check_bounds(1500, 1000, 2000).is_ok());
    assert!(check_bounds(1000, 1000, 2000).is_ok());
    assert!(check_bounds(2000, 1000, 2000).is_ok());
}

#[test]
fn test_contract_initialize_and_validate_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimestampBoundsGuardContract, ());
    let client = TimestampBoundsGuardContractClient::new(&env, &contract_id);

    client.initialize(&admin, &1000, &2000);

    let bounds: TimestampBounds = client.get_bounds();
    assert_eq!(bounds.min_timestamp, 1000);
    assert_eq!(bounds.max_timestamp, 2000);
    assert_eq!(client.get_admin(), admin);

    // Validate in-bounds timestamp
    assert!(client.try_validate_timestamp(&1500).is_ok());
}
